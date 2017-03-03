# Trailing Stop Loss App

A Node app built with NEAN stack (NeDB, Express, Angular, NodeJS)
Allows a user to track any number of stocks, with alerts being sent to a list of emails upon certain criteria being met.

1. If the high price (HP) for the day is more than 20% above the alert price (AP), amend the AP to equal HP-20%.
2. If HP is greater than AP by less than 20%, do nothing.
3. If closing price (CP) is less than AP, send alert to a given email address.
 
Other functionality that is included in the app is thus:

1. The capacity to amend AP at any time manually.
2. The capacity for multiple alert levels (eg. 5%, 10%, 20%) alterable at the user's discretion, whereby the above notification system will operate on the chosen basis.
3. The capacity to add or remove stocks from the list.

## Installation

1. Clone the repository: `git clone https://github.com/Jameseluke/trailstop.git`
2. Install the application: `npm install`
3. Create a file named config.json in the folder /app/mail containing a json object as below 
4. Start the server: `node server.js`
5. View in browser at `http://localhost:8080`

## Config.json
```javascript
{
  "username": "example@hotmail.com",
  "password": "Pa$$W0RD",
  "emails": ["sample@gmail.com", "Test@yahoo.com"]
 }
 ```
 
## Daily update
The update functionality of the program can be called daily by added the following to the servers crontab
```
crontab - 0 17 * * * curl 'localhost:8080/api/stocks/update'
```
