const { google } = require('googleapis');
const moment = require('moment');
const utils = require('./utils');
const db = require('./db');

const { NODE_ENV } = process.env;
const sheets = google.sheets('v4');

const { auth, sheetId } = init().then(res => res);

async function init() {
  try {
    const authClient = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const id = await utils.getDbOrConfigValue('config', 'google', 'sheet_id');
    return { authClient, id };
  } catch (err) {
    console.error('Error initialising Google APIs:', err);
    throw err;
  }
}

function getValuesAndFlatten(response) {
  const { values } = response.data;
  return [].concat.apply([], values);
}

async function getRowNumberForDate(dateString) {
  const request = {
    auth,
    spreadsheetId: sheetId,
    range: 'A:A'
  };
  try {
    console.log(auth);
    const response = await sheets.spreadsheets.values.get(request);
    const rowNumber = getValuesAndFlatten(response).indexOf(dateString) + 1;
    return rowNumber > 0 ? rowNumber : 1;
  } catch (err) {
    console.error(`Error getting row number: ${err}`);
    throw new Error(err);
  }
}

async function getSongDetailsFromSheet(rowNumber) {
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: sheetId,
      range: `B${rowNumber}:I${rowNumber}`
    });
    const values = getValuesAndFlatten(response);
    const mainSong = values[0];
    const runThrough = values[1];
    const notes = values[2];
    const mainSongLink = values[6];
    const runThroughLink =
      values[1] === '' || values[1] === null
        ? `https://docs.google.com/spreadsheets/d/${sheetId}`
        : values[7];
    return {
      mainSong,
      mainSongLink,
      runThrough,
      runThroughLink,
      notes
    };
  } catch (err) {
    console.log(
      `The API returned an error when trying to get song details: ${err}`
    );
    throw new Error(err);
  }
}

exports.getNextSongs = async function(dateString) {
  try {
    const rowNumber = await getRowNumberForDate(dateString);
    return await getSongDetailsFromSheet(rowNumber);
  } catch (err) {
    throw err;
  }
};

exports.testGoogleIntegration = async function(req, res) {
  const testDate = '04/02/2019';
  const rowNumber = await getRowNumberForDate(testDate);
  res.status(200).send(rowNumber);
};
