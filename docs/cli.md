# CLI

## Usage example {docsify-ignore}

```bash
# connection='postgresql://postgres:postgres@127.0.0.1:5432/postgres'

# 'sync' command
pg-differ sync --connection ${connection} --set mySchema=public --path ./objects --silent

# 'generate' command
pg-differ generate --connection ${connection} --table public.users --table public.roles --path ./objects
```

### sync

```
pg-differ sync [options]

Synchronization previously prepared schemes

Options:
  --help            Show help                                                         [boolean]
  --version         Show version number                                               [boolean]
  --path, -p        Directory path                                          [string] [required]
  --connection, -c  Connection URI to database                                         [string]
  --set, -s         Variable to replace placeholder in schema files                    [string]
  --force, -f       Force synchronization of tables and sequences    [boolean] [default: false]
  --silent, -S      Disable printing messages through the console    [boolean] [default: false]
```

### generate

```
pg-differ generate [options]

Generating schemas for existing database objects

Options:
  --help            Show help                                        [boolean]
  --version         Show version number                              [boolean]
  --path, -p        Directory path                         [string] [required]
  --connection, -c  Connection URI to database                        [string]
  --group, -g       Grouping by schema names        [boolean] [default: false]
  --table, -t       Table name                                        [string]
  --sequence, -s    Sequence name                                     [string]
```
