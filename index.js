const linkedom = require("linkedom");

// Settings
const allow_pii_logs = true; // Allow PII (Personally Identifiable Information) to logs, this may contain your school/library address, logins, emails, books etc.
const no_telemetry = true; // Enable to replace "?from=" query parameters with nothing

if (allow_pii_logs) console.warn("Allow PII Logs is on, library will log your personal info on error for better debugging!");

/**
 * Deletes known telemetry from URLs (like ?from= query params)
 * 
 * @param {string} url - URL
 * @returns {string} - URL without telemetry (if no_telemetry is on)
 */
function deleteTelemetry(url) {
    // TODO: Rewrite this thing

    if (no_telemetry) {
        // ?from= query params
        url = url.replace("?from=lastAdd", "");
        url = url.replace("?from=mostLended", ""); // They made a language error here lol
    }
    return url;
}

/**
 * Parse library info
 * 
 * @param {string} mainPageHtml - Raw HTML content of main page (/opacWeb/bstart/{libraryID})
 * @returns {{name: string, street: string, city: string} | null} - Parsed library data from html (Library name, street name and city name)
 */
function parseLibraryInfo(mainPageHtml) {
    const { document } = linkedom.parseHTML(mainPageHtml);

    // Parse header from html
    const parsedHeader = 
        document.querySelector("h2.header-library-info")
        .textContent // Parse text from header
        .split("\n") // Split by newlines
        .map(line => line.trim()) // Trim lines from spaces
        .filter(Boolean); // Filter empty entries

    // Check if parsed successfully
    if (parsedHeader.length < 3) {
        throw new Error(`Parsed header array length is less than 3 (Length: ${parsed_header.length}), invalid html file?`);
    }

    const libraryName = parsedHeader[0];
    let streetName;
    let cityName;

    // Header type 1 - "ul." / "al." prefix in line before street name
    if (parsedHeader.length == 4) {
        streetName = parsedHeader[1] + " " + parsedHeader[2]; // Join prefix and street name
        cityName = parsedHeader[3];
    }
    // Header type 2 - "ul." / "al." prefix in the same line as street name (or no prefix at all)
    else {
        // Check if header length valid
        if (parsedHeader.length != 3) {
            console.warn(`Error parsing library info! Header doesn't match any type (Array length: ${parsedHeader.length}, should be 3 or 4)`);

            if (allow_pii_logs) {
                console.warn("Allow PII logs is on, dropping info:");
                console.warn(parsedHeader);
            }
        }

        streetName = parsedHeader[1];
        cityName = parsedHeader[2];
    }

    return { name: libraryName, street: streetName, city: cityName };
}

/**
 * Checks if user is logged in
 * 
 * @param {string} mainPageHtml - Raw HTML content of main page (/opacWeb/bstart/{libraryID})
 */
function checkLoggedIn(mainPageHtml) {
    // Check if "zalogowany" variable is true or false
    const loggedIn = mainPageHtml.includes("var zalogowany = true;");
    let login = null;

    // If logged in, also parse login
    if (loggedIn) {
        const { document } = linkedom.parseHTML(mainPageHtml);

        login = document.querySelector("div.logged-as").getAttribute("data-original-title"); // Parse login from data-original-title argument
    }
    
    return { loggedIn: loggedIn, login: login };
}

// Helper for all list parsing functions
function _parseListInternal(page, maxBooks=10) {
    const { document } = linkedom.parseHTML(page);
    const carousel = document.querySelectorAll(".owl-carousel__element"); // Parse all book objects (from carousel)

    if (maxBooks == 0) maxBooks = carousel.length; // Set maxBooks to carousel length if its 0
    else if (maxBooks > carousel.length) maxBooks = carousel.length; // Set maxBooks to carousel length if its bigger than carousel length

    let books = [];

    for (let i = 0; i < maxBooks; i++) {
        if (i >= maxBooks) break;
        
        const book = carousel[i];
        let bookURL = book.querySelector("a").getAttribute("href");
        let bookCoverImage = book.querySelector("img").getAttribute("src");
        let bookName = book.querySelector(".owl-carousel__title").textContent.trim();
        let bookAuthor = book.querySelector(".owl-carousel__author").textContent.trim(); 

        bookURL = deleteTelemetry(bookURL); // Delete telemetry

        books.push({ name: bookName, author: bookAuthor, url: bookURL, imageURL: bookCoverImage });
        i++;
    };

    return books;
}

/**
 * Parses last added books
 * 
 * @param {string} lastAddedPage - Raw HTML content of last_add page (/opacWeb/last_add/{libraryID})
 * @param {number} maxBooks - Max number of books to return (0 = infinite)
 * @returns {Array<{ name: string, author: string, url: string, imageURL: string }>} - Array with book objects
 */
function parseLastAdded(lastAddedPage, maxBooks=10) {
    return _parseListInternal(lastAddedPage, maxBooks);
}

/**
 * Parses recently lent books
 * 
 * @param {string} lastLendPage - Raw HTML content of last_lend page (/opacWeb/last_lend/{libraryID})
 * @param {number} maxBooks - Max number of books to return (0 = infinite)
 * @returns {Array<{ name: string, author: string, url: string, imageURL: string }>} - Array with book objects
 */
function parseLastLent(lastLendPage, maxBooks=10) {
    return _parseListInternal(lastLendPage, maxBooks);
}

/**
 * Parses book set
 * 
 * @param {string} bookSetPage - Raw HTML content of book set page (/opacWeb/book_sets_start/{libraryID}/show/{bookSetID})
 * @param {number} maxBooks - Max number of books to return (0 = infinite)
 * @returns {Array<{ name: string, author: string, url: string, imageURL: string }>} - Array with book objects
 */
function parseBookSet(bookSetPage, maxBooks=10) {
    return _parseListInternal(bookSetPage, maxBooks);
}

/**
 * Get "Polecane przez bibliotekarza" (Recommended by librarian) book set ID
 * 
 * @param {string} mainPageHtml - Raw HTML content of main page (/opacWeb/bstart/{libraryID})
 * @returns {number | null} - ID of bookset or null if not found
 */
function parseRecommendedID(mainPageHtml) {
    const { document } = linkedom.parseHTML(mainPageHtml);

    const legend = document.querySelector("legend:contains('Polecane przez bibliotekarza')");

    const displayField = legend.parentNode;
    const url = displayField.querySelector("a");

    if (url) {
        return url.getAttribute("href").split("/")[5];
    } else {
        return null;
    }
}

// const file = require("node:fs");
// console.log(parseRecommendedID(file.readFileSync("example.html").toString()));