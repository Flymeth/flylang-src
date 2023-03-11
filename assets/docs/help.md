# Flylang Commandtool Helper

This document will show you the possibilities behind the `flylang` shell.

```py
flylang # Starts the "in-console" mode -> See the "in-console mode" section for more informations

flylang --info # Diplays the language's informations
flylang --help # Diplays this message
flylang --syntax # Diplays informations about the language's syntax
flylang --props # Diplays the current flylang interpreter behaviors' value

flylang <file in> # Runs the file located at the given path
flylang <file in> <file out>.py --langOutput=python  # Parses the file located at the first given path and try to compile it in python code and save the result in the second given path

flylang <file in> <file out>.txt --langOutput=debugger [--debugJsonFile=<fichier>.json] # Debugger mode
```

## In console mode

`In console mode` starts a new shell session where you can input your code directly inside the console.
This feature is actually in `BETA` so it mights not work.
To exit the session, simply type `//exit` or press `CTRL` (or `CMD`) + `C`.

### Commands

In console mode, you can type some custom command to make custom things.
Here are the valable commands:

- `//help` Displays the console mode commands
- `//clear` Clears the console mode terminal
- `//exit` Exits the console mode
