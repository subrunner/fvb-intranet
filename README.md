[![pipeline status](/../badges/master/pipeline.svg)](/../commits/master)

## Kundensteckbrief
| Technische Details         |   |
|--------------|---|
| ICEC Version | 6.0 |
| CNX Version  | 6.0 |
| Deployment   | Normales Deployment über ICEC und CNX  |

__Custom Widgets:__

| Name | Change | Zusatzinfo |
|:-------:|:------:|:------------------:|
|integrated-nav-customizing.js|Wiki als Navigation in Connections Header|in ganz Connections|
|ActivityStream.js|Fehler bei StatusUpdates in verschiedenen Sprachen gefixt| Siehe Zeile 3733|
|      |        |            |

## Getting Started:
- Download project [here](https://git.timetoact-group.com/XCC-Projects/Project-Template/repository/master/archive.zip)
- Fulfill the prerequisites ([Documentation](#prerequisite))
- npm install ([How to use npm](#npm))
- Create a new repository ([Git?](#git))
- Enter your Name as author in package.json
- Build your application with the default grunt task ([Grunt](#grunt))
- Include Custom Widgets into the project ([Widgets](#includeWidgets))
- When you are done, ask Christian Luxem or Peter Malcher to review and move to XCC-Projects ([move Project](#moveProject))

## Documentation
__Prerequisite:__<a name="prerequisite"></a>

- NodeJS must be installed (https://nodejs.org)
- Grunt must be installed globally `npm install -g grunt-cli` ([Grunt: Getting started](http://gruntjs.com/getting-started))
- Git must be installed (https://git-scm.com/downloads)
- Editor (of choice)

__Npm:__<a name="npm"></a>

- Open a terminal window (Mac: Terminal, Windows: Command Line (CMD))
- Navigate to where you downloaded the Project-Template folder to
    - use the command `cd` to switch folders relative to your current position (hit enter to confirm)
        - go outside of current folder with `cd ..`
    - use the command `ls` on mac (`dir`on windows) to show all files/folders that are in the current folder
    - TIP: go to the folder you want in the Finder on mac (Explorer on windows) and copy the path, then past it behind `cd ` in terminal to move there
- now type npm install and hit enter

To learn more about NPM visit [NPM](https://docs.npmjs.com/getting-started/what-is-npm).

__Git:__<a name="git"></a>

All you need to do here is:
- in the Terminal/Command Line (in the project folder, as with npm) type `git init`
- next `git add .`
- Now you neet to go to our [TTA Git](https://git.timetoact-group.com) and create a new repository there (Ask for help)
    - copy the link to the repo
- back in the terminal, type `git remote add origin ` and paste the link (e.g.`git remote add origin https://github.com/user/repo.git`)
- Commit the files: `git commit -m "Initial commit"`
- Finally, type `git push -u origin master` (you will get ask for your credentials to TTA Git. Enter them..)

To learn more about Git visit [Git-Getting Started](https://git-scm.com/book/en/v1/Git-Basics-Getting-a-Git-Repository).

__Grunt__<a name="grunt"></a>

- in the Terminal/Command Line window (in the project folder, as with npm) type `grunt`
- in your projects folder will appear a `dist` folder, in there are the finished files
- upload your finished files to xcc (ask for help if it isn't clear what to do)