async (event, steps, params) => {
    const datetime = require('node-datetime');
    //Date and time will be used later for logging
    dt = datetime.create()
    this.date = dt.format('Y-m-d')
    this.start_time = dt.format('H:M:S')
    this.header = params.header
    this.gsheet_id = params.google_sheet_id  
}