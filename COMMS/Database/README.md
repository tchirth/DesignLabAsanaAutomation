# Purpose
This workflow creates a database of subprojects and the sections they link to. Our projects (in COMMS at least) structured as follows.
~~~
PROJECTS
-MASTER PROJECT
---Section A
---Section B
---Section C
---Section D
-Subproject A
-Subproject B
-Subproject C
-Subproject D
~~~
Tasks in Section A are intended to sync to Subproject A and vice versa. Likewise for each other section-subproject pair. This workflow uses string similarity to create those link between subprojects and sections. For each subproject, it finds the section with the closest matching name to the subproject name. This is a case *insensitive* matching.

In previous versions, string similarity was not used. Instead, exact, case-sensitive matches were required. For example, for a project called "COMMS - Example" the matching section in "COMMS - MASTER" would **have to be exactly named** "Example" Any other string as the name would essentially break the whole automation program. Now, it uses a very basic form of fuzzy matching to decide which section name is closest to the project name. For example, with a project called "COMMS - Example" like before, imagine the sections in the master project are named as follows: "eXmple", "extra work", "lorem", "ipsum". Even though none of the strings match the expected project name ("Example"), anyone can see that the closest match is "eXmple". This program would link these in the database. 

This makes the program more robust. Users can change section names and make small spelling errors without affecting the synchronization operations.

The other obvious way to get around these issues with user-input strings is to manually link the global ids of corresponding sections and subprojects, so that no matter what the name is, they would still sync. The main problem this brings up is that the system manager (most likely me, the person writing this) would have to manually input these mathcing projects and sections into a database. This also means they would have to either constantly monitor this for changes and infer the connections OR users would have to reliably inform them whenever they make changes relating to this. Overal, this is just a clunky way to do it and should be avoided.

# Method
## Headers
In order to create a structure where multiple groups in the organization can have their own, somewhat contained ecosystem, we rely on project name headers. Each 'ecosystem' would have one master project, an arbitrary number of subprojects, and an agenda project (if desired). All projects for the COMMS group have "COMMS - " at the start of the project name. This way, we can take a large list of projects from multiple groups and just filter out those in a specific group. The database workflow is essentially copied for the Community group, just changing the header parameter to CMNT, rather than COMMS. To expand on the example above, here is how the overall structure looks with these two groups. It can expand to more groups with more headers, such as OPS, etc.
~~~
PROJECTS
-COMMS - MASTER PROJECT
---Section A
---Section B
-COMMS - Subproject A
-COMMS - Subproject B

-CMNT - MASTER PROJECT
---Section A
---Section B
-CMNT - Subproject A
-CMNT - Subproject B
~~~

## Scheduling
The best way to trigger this workflow would be to get webhooks from asana any time a project or section is added or its name is changed within the workspace of the Design Lab. Asana provides some functionality for these workspace-level webhooks, but there are difficulties with establishing the webhook for these larger resources. As of this writing (Sept 2020), I have not been able to make those work for this case. 

Pipedream allows the use of a CRON scheduler as a trigger. Currently it is set such that this workflow triggers once a day, at midnight PST. This ensures that the database is generally up-to-date, while not taking up to much of the computing quota.

# Parameters
**header**: COMMS


# Steps
## params
This sets the header parameter. One Google Spreadsheet file is used as a database for all header groups, as well as a log of webhooks created, so an environment variable is used for the spreadsheet id. This header is used to filter out important projects and to determine the sheet name in the spreadsheet file. In theory, one can just copy the workflow, and change the header parameter for this to work with a new group.

---
## projects_with_header
Pipedream has a built in integration to search for a project by name. To do this, it retrieves all projects in Asana that the authorizing account has access to and searches through those to find one matching project. This step is slightly modified from that to return all projects that have a defined header in them. For the case of this specific workflow, it returns an object with the names and gids of every project with 'COMMS' in the title. This search process is case *insensitive*. It also returns the gid of the master project in that group for later use.

---
## sections
This steps again modifies an existing Pipedream-made integration. It returns an object of the names and gids of all of the sections in the master project, whose gid was determined previously.

---
## matching
As previously described, this step uses string similarity to match project names to section names. Here, I will go more in-depth on the exact logic of the matching. As a note, there is technically an 'invisible' section for tasks not put in any created section. This is labelled by Asana as '(no section)'.

Iterating through the projects that are listed we look at the project's name. If the project is the group's MASTER project or the Agenda project, it gets linked to '(no section)'. Otherwise, finds the closest match between the project name and a section name. For each of these, it adds a line to an array, which is shown below. When it finds a match, it also deletes that section name from the sections object so that two subprojects are never linked to the same section. Any unmatched section is then added to the end of the array without a linked project.

Example of match array:
~~~
array = [
    [MASTER_PROJECT, MASTER_GID, '(no section)', no_section_gid],
    [Subproject A, subprojectA_GID, Section A, sectionA_GID],
    [Subproject B, subprojectB_GID, Section B, sectionB_GID],
    [Meeting Agenda, agenda_GID, '(no section)', no_section_gid],
    ['', '', On Hold, on_hold_gid]
]
~~~

---
## sheets_spreadsheets_values_batch_clear
This is a built-in step in Pipedream that is used (in this case) to clean an entire page of a spreadsheet. It clears the sheet for the database before the next steps prints the most up-to-date database array.

---
## add_multiple_rows_to_sheet
This is another built-in steps that is simply used to print the array to the database Google Spreadsheet