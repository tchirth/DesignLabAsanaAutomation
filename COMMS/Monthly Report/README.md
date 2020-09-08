# Purpose
For logging and reporting purposes, it was decided to make a monthly list of all tasks and subtasks completed each month.

---
# Method
This program runs on the first of every month and does the following.
1. Determines the "report month", the month for which the report is being generated. Since this runs on the first, it simply takes the prior month to when the program runs.
2. Gets all tasks in **COMMS - MASTER** and iterates through them.
3. If the task was completed during the report month, add it to a list.
4. look for subtasks of each task. Add any coompleted in the report month to the list.
5. Create a new sheet on the Monthly Report Google Spreadsheet for the report month and print the list of completed tasks to it.