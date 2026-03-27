# Authentication Routes

-------------------

### `api/login`

Logs the user in by setting the `session-id` and `token` cookies

**POST**

BODY:

 -- Required --

`username` - the username of the user

`password` - the associated password

**RESPONSES**

`400` - parameters are invalid

`404` - username does not exist

`401` - password is incorrect

`200` - signed in

Headers:

`Set-Cookie: session-id=<SESSIONID>;`

`Set-Cookie: token=<TOKEN>`

-----------------

### `api/oauth`

Used to authenticate a user with OAuth.

**POST**

BODY:

`provider` - the oauth provider, currently only supports `hack-club`

`code` - the code provided by the oauth

`redirect_uri` - the URI that was redirected to

RESPONSES

`401` - Failed to authenticate

`200`:

`Set-Cookie: session-id=<SESSIONID>;`

`Set-Cookie: token=<TOKEN>`

-----------------

### `/api/register`

used to create an account

**POST**

BODY:

 -- Required --

`username` - username

`password` - password

 -- Not Required --

`email` - the user's email

RESPONSES

`409` - Username already exists

`200` - Successful register

---------------

### `/api/me`

returns the currently signed in user's information

**GET**

RESPONSE

`401` - not signed in

`200`:

`username` - the user's username

`user` - the user's id

`theme` - the user's preferred theme
