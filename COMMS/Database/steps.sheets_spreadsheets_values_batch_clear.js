async (params, auths) => {
    const data = {
        ranges: params.ranges,
    }
    const config = {
        method: "post",
        url: `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values:batchClear`,
        headers: {
            Authorization: `Bearer ${auths.google_sheets.oauth_access_token}`,
        },
        data,
    }
    return await require("@pipedreamhq/platform").axios(this, config)
}