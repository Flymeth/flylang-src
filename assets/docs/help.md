# Flylang Commandtool Helper

This document will show you the possibilities behind the `flylang` shell.

```py
flylang --info # Diplays the language's informations
flylang --help # Diplays this message
flylang --syntax # Diplays informations about the language's syntax
flylang --props # Diplays the current flylang interpreter behaviors' value

flylang <file in> # Runs the file located at the given path
flylang <file in> <file out>.py --langOutput=python [--debugJsonFile=<fichier>.json] # Parses the file located at the first given path and try to compile it in python code and save the result in the second given path
flylang <file in> <file out>.txt --langOutput=debugger [--debugJsonFile=<fichier>.json] # Debugger mode
```
