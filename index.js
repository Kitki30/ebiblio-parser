const linkedom = require("linkedom");

// Settings
const allowPIILogs = true; // Allow PII (Personally Identifiable Information) to logs, this may contain your school/library address, logins, emails, books etc.
const noTelemetry = true; // Enable to replace "?from=" query parameters with nothing

if (allowPIILogs) console.warn("Allow PII Logs is on, library will log your personal info on error for better debugging!");

function cleanField(text) {
    return text
        .replaceAll("\n", "") // Delete all new lines (Because e-biblio maintainers like spaces)
        .replaceAll(/\s{2,}/g, ' ') // Replace all double spaces with one space
        .replaceAll(" ,", ",") // Fix commas
        .trim();
}

/**
 * Deletes known telemetry from URLs (like ?from= query params)
 * 
 * @param {string} url - URL
 * @returns {string} - URL without telemetry (if noTelemetry is on)
 */
function deleteTelemetry(url) {
    // TODO: Rewrite this thing

    if (noTelemetry) {
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
        throw new Error(`Parsed header array length is less than 3 (Length: ${parsedHeader.length}), invalid html file?`);
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

            if (allowPIILogs) {
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
    };

    return books;
}

/**
 * Parses recently added books
 * 
 * @param {string} lastAddedPage - Raw HTML content of last_add page (/opacWeb/last_add/{libraryID})
 * @param {number} maxBooks - Max number of books to return (0 = infinite)
 * @returns {Array<{ name: string, author: string, url: string, imageURL: string }>} - Array with book objects
 */
function parseRecentlyAdded(lastAddedPage, maxBooks=10) {
    return _parseListInternal(lastAddedPage, maxBooks);
}

/**
 * Parses recently lent books
 * 
 * @param {string} lastLendPage - Raw HTML content of last_lend page (/opacWeb/last_lend/{libraryID})
 * @param {number} maxBooks - Max number of books to return (0 = infinite)
 * @returns {Array<{ name: string, author: string, url: string, imageURL: string }>} - Array with book objects
 */
function parseRecentlyLent(lastLendPage, maxBooks=10) {
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

/**
 * Get library logo path
 * 
 * @param {string} logoInfoJson - Logo info json from /opacWeb/get_logo.json?bibId={library_id}
 * @param {number} libraryId - Library ID
 * @returns {{ exists: boolean, imageURL: string | undefined }}
 */
function parseLogoPath(logoInfoJson, libraryId) {
    const json = JSON.parse(logoInfoJson);

    const logoExists = json.logoExists;
    let logoURL = undefined;

    if (logoExists) {
        logoURL = `/opacWeb/get_logo.${json.extension}?bibId=${libraryId}`;
    }

    return { exists: logoExists, imageURL: logoURL };
}

/**
 * Parses OPAC version from footer
 * 
 * @param {string} mainPageHtml - Raw HTML content of main page (/opacWeb/bstart/{libraryID})
 * @returns {{ major: number, minor: number, patch: number }} - OPAC Version
 */
function parseVersion(mainPageHtml) {
    const { document } = linkedom.parseHTML(mainPageHtml);

    const versionElement = document.querySelector("div.footer__title");
    if (!versionElement) return null;

    const footerText = "OPAC e-Biblioteka - katalog online - dostęp dla czytelników bibliotek szkolnych, wersja "; // To remove
    const versionString = versionElement.textContent.replace(footerText, "").trim(); // Remove footer text
    const versionArray = versionString.split(".").map(i => Number.parseInt(i)); // Split to array and convert to int

    console.log("E-Biblioteka v" + versionString + " detected!");

    return { major: versionArray[0], minor: versionArray[1], patch: versionArray[2] }
}

/**
 * Parses book info
 * 
 * @param {string} bookPage - Book page HTML from /opacWeb/item/{library_id}/show_record/{book_id}
 * @returns {{
 *  author: string | null,
 *  coauthor: string | null,
 *  title: string | null,
 *  type: string | null,
 *  series: string | null,
 *  genre: string | null,
 *  topic: string | null,
 *  audience: string | null,
 *  publisher: string | null,
 *  releaseYear: string | null,
 *  volume: string | null,
 *  publicationLocation: string | null, 
 *  edition: string | null,
 *  timeOfWriting: string | null,
 *  isbn: string | null,
 *  udc: string | null,
 *  nationalLibrary: boolean,
 *  wolneLektury: boolean,
 *  wolneLekturyURL: string | null,
 *  available: number,
 *  lent: number
 * }}
 */
function getBookInfo(bookPage) {
    const { document } = linkedom.parseHTML(bookPage);

    const fieldNames = document.querySelectorAll("div.content[role=main] div.record__label");
    const fields = document.querySelectorAll("div.content[role=main] div.record__text");

    // Parsed from main list
    let author = null;
    let coauthor = null;
    let title = null;
    let type = null;
    let series = null;
    let genre = null;
    let topic = null;
    let audience = null;
    let publisher = null;
    let releaseYear = null;
    let volume = null;
    let publicationLocation = null;
    let edition = null;
    let timeOfWriting = null;
    let isbn = null;
    let udc = null;

    for (let i = 0; i < fieldNames.length; i++) {
        // Clean field
        const fieldName = cleanField(fieldNames[i].textContent.trim());
        const fieldClean = cleanField(fields[i].textContent);

        switch (fieldName) {
            // Author
            case "Autor":
                if (!author) author = fieldClean;
                break;

            // Co-author(s)
            case "Współautor":
                if (!coauthor) coauthor = fieldClean;
                break;

            // Title
            case "Tytuł":
                if (!title) title = fieldClean;
                break;

            // Type
            case "Forma i typ":
                if (!type) type = fieldClean;
                break;

            // Series
            case "Seria":
                if (!series) series = fieldClean;
                break;

            // Genre
            case "Gatunek":
                if (!genre) genre = fieldClean;
                break;

            // Topic
            case "Temat":
                if (!topic) topic = fieldClean;
                break;

            // Audience
            case "Odbiorca":
                if (!audience) audience = fieldClean;
                break;

            // Publisher
            case "Wydawca":
                if (!publisher) publisher = fieldClean;
                break;

            // Release year
            case "Rok wydania":
                if (!releaseYear) releaseYear = fieldClean;
                break;

            // Volume
            case "Objętość":
                if (!volume) volume = fieldClean;
                break;

            // Publication location
            case "Miejsce wydania":
                if (!publicationLocation) publicationLocation = fieldClean;
                break;

            // Edition
            case "Wydanie":
                if (!edition) edition = fieldClean;
                break;

            // Time of writing
            case "Czas powstania":
                if (!timeOfWriting) timeOfWriting = fieldClean;
                break;

            // ISBN
            case "ISBN/ISSN":
                if (!isbn) isbn = fieldClean;
                break;

            // UDC
            case "UKD":
                if (!udc) udc = fieldClean;
                break;

            // Fallback if unknown
            default:
                console.warn(`Unknown field '${fieldName}' with value '${fieldClean}'`);
                break;
        }
    }

    // Parse book count
    let availableToLend = 0;
    let lent = 0;

    const lendStatusObject = document.querySelector("div.buttons-toolbar-borrow-numbers");
    if (lendStatusObject) {
        const availableToLendText = lendStatusObject.querySelector("div").textContent;
        const lentText = lendStatusObject.querySelector("div.col-md-offset-2").textContent;

        availableToLend = Number.parseInt(cleanField(availableToLendText).replace("Do wypożyczenia: ", ""));
        lent = Number.parseInt(cleanField(lentText).replace("W wypożyczeniu: ", ""));
    }

    // Parsed from badges
    let nationalLibrary = false;
    let wolneLektury = false;
    let wolneLekturyURL = null;

    const nationalLibraryBadge = document.querySelector("img[title='Rekord bibliograficzny z Biblioteki Narodowej']"); // Parse national library badge
    if (nationalLibraryBadge) nationalLibrary = true;

    const wolneLekturyBadge = document.querySelector("img[title='Rekord dostępny w serwisie Wolne Lektury']"); // Parse Wolne Lektury badge
    if (wolneLekturyBadge) {
        wolneLektury = true;
        wolneLekturyURL = wolneLekturyBadge.parentNode.getAttribute("href"); // Parse URL to Wolne Lektury
    }

    // Warning! Some books have other info, so some of this may be null
    // Some books have tags in author field (e.g. "Mickiewicz, Adam (1798-1855)"),
    // these tags are author's date of birth and/or date of death (Or nothing if author is still alive, e.g. "Kosmowska, Barbara (1958- )")
    return { 
        author: author,
        coauthor: coauthor, // Other authors like illustrators
        title: title,
        type: type, // Form (e.g. book) and type (e.g. poetry) - "Książki, Poezja" / "Books, Poetry"
        series: series,
        genre: genre,
        topic: topic,
        audience: audience, // Targed ages or something
        publisher: publisher,
        releaseYear: releaseYear,
        volume: volume, // In pages or something else
        publicationLocation: publicationLocation,
        edition: edition,
        timeOfWriting: timeOfWriting, // Time of writing of the book (e.g. "1801-1900")
        isbn: isbn, // Book ISBN
        udc: udc, // Book ID (see https://en.wikipedia.org/wiki/Universal_Decimal_Classification)
        available: availableToLend, // Number of books available to lend
        lent: lent, // Number of books that are currently lent
        nationalLibrary: nationalLibrary, // true if book has a record in Polish National Library 
        wolneLektury: wolneLektury, // true if book is free to read in WolneLektury service (Data from your library, this doesn't call WolneLektury API)
        wolneLekturyURL: wolneLekturyURL // URL to WolneLektury if book is free to read in this service 
    }
}

// For testing (node.js only)
// const file = require("node:fs");
// console.log(getBookInfo(file.readFileSync("pantadeusz.html").toString()));
// console.log(getBookInfo(file.readFileSync("book.html").toString()));

module.exports = {
    parseLibraryInfo,
    parseBookSet,
    parseRecentlyAdded,
    parseRecentlyLent,
    parseRecommendedID,
    checkLoggedIn,
    deleteTelemetry,
    parseLogoPath,
    parseVersion
}