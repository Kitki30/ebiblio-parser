# E-Biblioteka API docs

## Base info

Base domain: ``https://biblioteka.librus.pl``

### Cookies
``ebiblio_default_bibid`` - Default library ID for student
``JSESSIONID`` - Session token (can be obtained by going to ``https://synergia.librus.pl/ebiblio``)

## Endpoints

### /opacWeb/bstart/{library_id}
- Auth?: No
- Parser functions: ``parseLibraryInfo(), checkLoggedIn(), parseRecommendedID(), parseVersion()``

Returns HTML with library info, user info, version and "recommended by librarian" bookset id

### /opacWeb/last_lend/{library_id}
- Auth?: No
- Parser function: ``parseRecentlyLent()``

Returns HTML file with carousel of recently borrowed books (entire library)

### /opacWeb/last_add/{library_id}
- Auth?: No
- Parser function: ``parseRecentlyAdded()``

Returns HTML file with carousel of recently added books

### /opacWeb/get_logo.json?bibId={library_id}
- Auth?: No
- Parser function: ``parseLogoPath()``

Returns json with libraries logo extension


Libraries with logo set:
```json
{
    "extension": "jpg",
    "logoExists": true
}
```

Libraries with unset logo:
```json
{
    "logoExists":false
}
```

### /opacWeb/get_logo.{extension}?bibId={library_id}
- Auth?: No
- Parser function: No parser, returns image

Returns library logo, check if library has logo set and get url to it with parseLogoPath()

### /opacWeb/account
- Auth?: Yes
- Parser function: no parser yet

Returns your lent books and expiry dates

### /opacWeb/history
- Auth?: Yes
- Parser function: no parser yet

Returns your previously lent books

### /opacWeb/item/{library_id}/show_record/{book_id}
- Auth?: No
- Parser function: ``getBookInfo()``

Returns book info

### /opacWeb/record/get_covers.json?bibliotekaid={library_id}&rekordid={book_id}
- Auth?: No
- Parser function: No parser yet

Returns book cover info


Books with covers:
```json
{
    "central": [],
    "altText": "Widmark, Martin Tajemnica biblioteki",
    "minio": [
        {
            "okladkaId": 427195,
            "pokazWOpac": true,
            "glowna": true,
            "nazwa": "Tajemnica biblioteki"
        }
    ],
    "local": []
}
```
- ``central`` - Unknown, probably something like ``minio`` from other server??
- ``altText`` - Image alternative text
- ``minio`` - MinIO? Hosted book covers
- ``local`` - Unknown, locally hosted covers?

Cover object (minio):
- ``okladkaId`` - book cover ID
- ``pokazWOpac`` - if true, cover will be shown in Opac/Website
- ``glowna`` - if true, this is the main cover
- ``nazwa`` - cover name

Books without covers:
```json
{
    "central": [],
    "altText": "Mickiewicz, Adam Pan Tadeusz /",
    "minio": [],
    "local": []
}
```

### /opacWeb/record/get_cover_minio.jpg?id={cover_id}
Auth?: No
Parser: No, this returns an image

Returns cover image