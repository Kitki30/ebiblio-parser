import * as file from 'node:fs';
import * as ebiblio_parser from './index.js';
import test from 'node:test';
import assert from 'node:assert';

console.log("Loading test files...");
const noLoginHtml = file.readFileSync("./test_examples/no_login.html").toString();
const loggedInHtml = file.readFileSync("./test_examples/logged_in.html").toString();
const recommendedHtml = file.readFileSync("./test_examples/recommended_by_librarian.html").toString();
const footerHtml = file.readFileSync("./test_examples/footer.html").toString();
const recentlyAddedHtml = file.readFileSync("./test_examples/recently_added.html").toString();
const historyHtml = file.readFileSync("./test_examples/history.html").toString();

test('Account history parser test', (t) => { 
    const shouldReturn = [
        {
            type: 'Książka',
            inventoryNumber: 'TEST1',
            signature: 'Ob',
            title: 'Atlas wulkanów',
            author: 'Admin',
            lendDate: '23.04.2026',
            returnDate: '18.06.2026',
            bookURL: '/opacWeb/item/123/show_record/1'
        },
        {
            type: 'Książka',
            inventoryNumber: 'TEST2',
            signature: '82-2',
            title: 'Jestem święty, kl.1',
            author: 'Religio Vacuitas',
            lendDate: '18.03.2026',
            returnDate: '19.03.2026',
            bookURL: '/opacWeb/item/123/show_record/2'
        },
        {
            type: 'Książka',
            inventoryNumber: 'TEST3',
            signature: '821.111-3',
            title: 'Test -/&*#123',
            author: 'Test OK',
            lendDate: '14.01.2026',
            returnDate: '06.03.2026',
            bookURL: '/opacWeb/item/123/show_record/3'
        }
    ];

    assert.deepStrictEqual(ebiblio_parser.parseHistory(historyHtml), shouldReturn);
});

test('Recently added/Bookset parser test', (t) => {
    const shouldReturn = [ 
        { 
            name: 'Atlas wulkanów', 
            author: 'Admin', 
            url: '/opacWeb/item/123/show_record/1', 
            imageURL: '/opacWeb/images/okladka_temp_1-a2eee0c35dbcd8f263287a4c4a37839f.jpg' 
        }, 
        { 
            name: 'Jestem święty, kl.1',
            author: 'Vacuitas, Religio',
            url: '/opacWeb/item/123/show_record/2',
            imageURL: '/opacWeb/images/okladka_temp_10-33abdbcfb54c7eb9b3fe004c2d023c40.jpg'
        }, 
        { 
            name: 'Test -/&*#123',
            author: 'Test OK',
            url: '/opacWeb/item/123/show_record/3',
            imageURL: '/opacWeb/images/okladka_temp_8-53947a5324b41d9111907f8d2f8c0b47.jpg' 
        }
    ];

    assert.deepStrictEqual(ebiblio_parser.parseRecentlyAdded(recentlyAddedHtml), shouldReturn);
});

test('Version parser test', (t) => {
    const shouldReturn = { major: 2, minor: 0, patch: 4 };

    assert.deepStrictEqual(ebiblio_parser.parseVersion(footerHtml), shouldReturn);
});

test('Recommended by librarian ID parser test', (t) => {  
    const shouldReturn = '123';

    assert.deepStrictEqual(ebiblio_parser.parseRecommendedID(recommendedHtml), shouldReturn);
});

test('checkLoggedIn - Logged in test', (t) => {
    const shouldReturn = {
        loggedIn: true,
        login: '1234567u'
    };

    assert.deepStrictEqual(ebiblio_parser.checkLoggedIn(loggedInHtml), shouldReturn);
});

test('checkLoggedIn - No login test', (t) => {
    const shouldReturn = {
        loggedIn: false,
        login: null
    };

    assert.deepStrictEqual(ebiblio_parser.checkLoggedIn(noLoginHtml), shouldReturn);
});