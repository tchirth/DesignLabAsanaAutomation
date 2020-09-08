# Webhooks

This workflow recieves webhooks from **COMMS - MASTER** when a task is added to the project or to a section and when a task is changed in any of the following fields: assignee, due_on, custom_fields, completed.

# Parameters
***header***: COMMS

# Logging
Many steps include an asynchronous function that prints a line to the google sheet specified in the params step. This helps keep a log of all actions taken by the automation. After it takes any action such as changing the due date of a task or adding the task to a project, the program creates a row and prints it to the gsheet file in the corresponding page.

# Steps
## create_or_respond
If the webhook is being established, it will include 'x-hook-secret' as a key. In this case, this step sends a successful response and logs 'x-hook-secret'. This value needs to be recorded when manually logging the webhook in the spreadsheet. It then ends the workflow, as the webhook contains no event data.

If the webhook is not new and acutally contains event data, is sends a success response and continues to the following steps.

---

## params
This sets parameters like the project header and the google sheet ID for the sync log. This allows for expansion to other groups with different headers (eg. CMNT, etc.) without requiring signifanct recoding. In theory, one can just copy the workflow, change the header parameter (and gsheet id), and establish the proper webhook for this to work with a new group.

---
## tasks
Here, the webhook body data is decoded from base64 and parsed to determine what actions it represents. Asana webhooks contain events. These events encompass every change in Asana from new tasks to changed values to deleted tasks. More often than not, webhooks from Asana contain the changes to one task, but sometimes, multiple are included. To deal with this, we make an object with a key, value pair for each task mentioned in the webhook. For each, we list the data included in the webhooks, sorted by whether the event was of type *changed* or type *added*. Thus, for each task with an update, we can do the following.

#### Get
- Gets the total task data from Asana.
- If the sync exception keyword ('$DO_NOT_SYNC') is present at the start of the task's description, it deletes this task from the object and continues, so that no sync operation is performed on said excepted task.
#### Subtask
- If the change was relevant, determines whether the task is a subtask. 
- For the subtask sync operation, we only need to make a change when a subtask is completed or its assignee or due date are changed. If the event is in one of those categories AND the task is a subtask, the gid of the subtask's parent task is recorded. This is the only operation run on subtasks, so it skips the rest of these and continues to the next task.
#### Agenda & On Hold
- If the change event occured in 'custom fields', it checks for events in two specific fields: 'Agenda Discussion' and 'Status_'.
- If 'Agenda Discussion' is changed, it defines a boolean called 'agendaVal' inside the task that is true if the field is set to 'YES' and false if not. More abstractly, if the task was changed such that it *should be in* the agenda, this value is marked true. If the task was changed such that it *should not be in* the agenda, this value is marked false. If no change was made realting to the agenda, the value is not present.
- Similarly, if there is a change is the 'Status_' field, a boolean called 'holdVal' is defined that is true if 'Status_' is set to 'On Hold' and false otherwise. To abstact it somewhat again, if the status is changed to 'On Hold', this value is marked true. If the status is changed to something other than 'On Hold', this falue is marked false. If no change was made to the task's status, this value is not present.
#### Section & Projects
- Determines the section the task is in under the **COMMS - MASTER** project.
- Creates a list of all of the projects the task is in.

### Examples
Below, some examples of the task dictionary are included with the context that describes them. Some data has been abbreviated for the sake of making it readable.
#### Example 1
This is a the tasks object created when a *subtask* is completed, or the assignee/due date are changed. Here, we see that there was no 'added' webhook relating to this task and one change was made to it. We also see the gid of the parent task. Finally we see the total data of the subtask under task.
~~~
steps.tasks.tasks = {
    "EXAMPLE_SUBTASK_GID" : {
        "added" : [],
        "changed" : [{
            "action": "changed",
            "change": {...},
            "created_at": "2020-09-03T00:55:31.661Z",
            "resource" : {...},
            "user": {...}
        }],
        "parent": "EXAMPLE_PARENT_TASK_GID",
        "task": {...}
    }
}
~~~

#### Example 2
For a larger example here, imagine data for three tasks are sent at once. Task1 is added to a given section in  **COMMS - MASTER** and its status is set to something *other than* 'On Hold'. For Task2, the field 'Agenda Discussion' is set to 'YES', BUT 'Status_' is not changed. Finally, for Task3, 'Status_' is set to 'On Hold' and 'Agenda Discussion' is cleared of any value.

~~~
steps.tasks.tasks = {
    "EXAMPLE_TASK1_GID": {
        "added": [{...}],
        "changed": [{...}],
        "holdVal": false,
        "projects" : [
            "PROJECT_1_GID",
            "PROJECT_2_GID"
        ],
        "section": "EXAMPLE_SECTION_GID"
        "task":{...}
    },
    "EXAMPLE_TASK2_GID":{
        "added": [],
        "changed: [{...}],
        "agendaVal": true,
        "projects" : [...],
        "section": "EXAMPLE_SECTION_GID",
        "task": {...}
    },
    "EXAMPLE_TASK3_GID":{
        "added": [],
        "changed: [
            {...},
            {...}
        ]
        "agendaVal": false,
        "holdVal": true,
        "projects" : [...],
        "section": "EXAMPLE_SECTION_GID",
        "task": {...}
    }
}
~~~
Some things to note here: **1)** Only Task1 has any values in "added" as it was the only one with any such event. **2)** Task3 has two change values as two fields were changed for it. **3)** For each task, if no change happens to either of the "Agenda Discussion" or "Status_" fields, the corresponding boolean value is not even present in the object. True and false here respectively represent whether the task should be *added or removed* from the Agenda or On Hold section. Thus, if the value is not present, no change has to be made with respect to it.


We can then use this steps.tasks.tasks object as a guide to perform all necessary sync actions.

---
## get_gids
This steps creates accesses the database of project and section gid's kept in Google Sheets and creates 3 objects.

steps.get_gids.projs has a key, value pair with each project name under the defined **header** parameter and its corresponding gid.

steps.get_gids.sections has a key value pair for each section in **COMMS - MASTER** and its corresponding gid.

steps.get_gids.matches_s2p has a key, value pair matching section gid's to the corresponding subproject's gid. This matching is done each day when the corresponding database workflow refreshes the databse. This is when we sync tasks from sections to their corresponding subproject.

It also uses string similarity to determine the gid of **COMMS - MASTER** which will be used later.

---
## subtask
Iterating through tasks in steps.tasks.tasks, if 'parent' is a key in the task object, which implies that the task is actually a subtask, this step performs the subtask synchronization.
1. Get the parent task's data from Asana. If the subtask sync exception keyword ('$ST_DO_NOT_SYNC') is at the start of that task, skip it and move tot he next task.
2. Get all of the parent task's subtasks from Asana. 
3. Determine the minimum (and thus earliest) due date of any of the subtasks.
4. Compare this minimum date to the parent task's due date. If the minimum date is not equal to the parent's due date or if the minimum date's corresponding assignee is not equal to the parent's assignee, update the parent task to match. Then, print to the Google Sheets Log to record this action.

---
## down
Iterating through tasks in steps.tasks.tasks, if the task has been moved to or added to a section in **COMMS - MASTER** or was created in a given section in **COMMS - MASTER**, this step synchronizes it to the matching subproject.
1. Use steps.get_gids.matches_s2p to match the section that the task was added to with the corresponding subproject.
2. Check if the task is already in said subproject. If it is not, add the task to that project.

#### Notes
We do not remove tasks from projects in this automation because there are often instances where a task is related to two subproject. It would be complex to move a task to the corresponding subproject and remove it from all other, as well as likely confusing the user and making these automations feel less usable.

---
## agenda
Iterating through tasks in steps.tasks.tasks, if 'agendaVal' is a key in the task object, which implies that there was a change in the task's "Agenda Discussion" field, this step performs the agenda synchronization.

For each such task, there are two boolean values. The agendaVal value is a boolean describing if the task *should* be in the agenda project. There is also a true/false for if the task *is currently* in the agenda project. This combination of two booleans gives four possible outcomes, of which we only have to act on two. If the task *should* be in the agenda and *currently is* OR if the task *should not* be in the agenda and *currently is not*, we do not need to take any action. In other words, the two booleans match and the task is where it should be relative to the agenda. Now there are two remaining possibilities.
- If the task *should* be in the agenda (agendaVal is true) and the task *is not currently in* the agenda, it gets added to the agenda project.
- If the task *should not* be in the agenda (agendaVal is false) and the task *is currently in* the agenda, it gets removed from the agenda project.

---
## on_hold
Iterating through tasks in steps.tasks.tasks, if if 'holdVal' is a key in the task object, which implies that there was a change in the task's "Status_" field, this step performs the On Hold synchronization.

Similarly to the Agenda operation, there are two boolean values. One describes if the task *should be in* the "On Hold" section (holdVal). The other describes if the task *currently is in* the "On Hold" section. Again, if these booleans match, there is no need to take any action, so we have two possibilities.
- If the task *should* be in the On Hold section (holdVal is true) and the task *is not currently in* the On Hold section, it gets added to the On Hold section.
- If the task *should not* be in the On Hold section (holdVal is false) and the task *is currently in* the On Hold section, it gets removed from the On Hold section.

---