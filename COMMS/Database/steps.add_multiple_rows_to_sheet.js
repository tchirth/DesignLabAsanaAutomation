async (params, auths) => {
    const { rows } = params

    // Validate data input -- check `rows` data is an array of arrays
    let inputValidated = true
    
    if (!rows || !rows.length || !Array.isArray(rows)) {
      inputValidated = false
    } else {
      rows.forEach(row => { if(!Array.isArray(row)) { inputValidated = false } })
    }
    
    // Throw an error if input validation failed
    if(!inputValidated) {
      console.error("Data Submitted:")
      console.error(rows)
      throw new Error("Rows data is not an array of arrays. Please enter an array of arrays in the `Rows` parameter above. If you're trying to send a single rows to Google Sheets, search for the action to add a single row to Sheets or try modifying the code for this step.")
    }
    
    // Configure object to post data to Google Sheets
    const config = {
      method: "post",
      url: `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${params.sheetName}:append`,
      params: {
        includeValuesInResponse: true,
        valueInputOption: "USER_ENTERED"
      },
      headers: {
        Authorization: `Bearer ${auths.google_sheets.oauth_access_token}`,
      },
      data: {
       values: rows,
      }
    }
    
    // Post data to Google Sheets and return transaction metadata
    return (await require("@pipedreamhq/platform").axios(this, config)).updates
}