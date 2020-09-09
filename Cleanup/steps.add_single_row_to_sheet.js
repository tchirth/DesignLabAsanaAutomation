async (params, auths) => {
    const { columns } = params

    // validate input
    if (!columns || !columns.length) {
      throw new Error("Please enter an array of elements in the `Columns` parameter above")
    } else if (!Array.isArray(columns)) {
      throw new Error("Column data is not an array. Please enter an array of elements in the `Columns` parameter above.")
    } else if (Array.isArray(columns[0])) {
      throw new Error("Column data is a multi-dimensional array. A one-dimensional is expected. If you're trying to send multiple rows to Google Sheets, search for the action to add multiple rows to Sheets, or try modifying the code for this step.")
    }
    
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
       values: [columns],
      }
    }
    return (await require("@pipedreamhq/platform").axios(this, config)).updates
}