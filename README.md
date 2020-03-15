# COVID-19 Finland - Telegram & Discord bot

[![Add on Discord](https://i.imgur.com/brcmkNV.png)](https://discordapp.com/oauth2/authorize?&client_id=688213304153341952&scope=bot&permissions=0)
[![Add on Telegram](https://i.imgur.com/iLvdJig.png)](https://t.me/PandemiaBot)

This project allows you to check reported COVID-19 cases in Finland and subscribe to notifications about every N (or all) new cases. Currently supported platforms are [Telegram](https://telegram.org/) and [Discord](https://discordapp.com/) which can be run separately or in parallel depending on which API tokens are provided to the program.   

Here are the supported commands: 
```
today - show cases today
status - show a summary
notify - setup notifications
about - show about
help - show this text
```

Here is an example:

![Example image of the bot in use](https://i.imgur.com/iw4aGuI.png)


## Running
To run this project yourself, you need a Telegram or a Discord API token.

Telegram: https://core.telegram.org/bots  
Discord: https://discordapp.com/developers/docs/intro

### Running without Docker

```bash
# Install dependencies
npm install
# Import your API tokens
echo "TELEGRAM_API_TOKEN=secret" > .env
echo "DISCORD_API_TOKEN=secret" > .env 
# Start
npm start
```

### Running with Docker
```bash
# Build the container image
docker build -t fi-corona-bot .
# Run with the your API tokens
docker run -d \
-e TELEGRAM_API_TOKEN=secret \
-e DISCORD_API_TOKEN=secret \
fi-corona-bot
```
---
The bot uses data from the 
[public coronavirus dataset](https://github.com/HS-Datadesk/koronavirus-avoindata) by HS.fi.
The service is for indicative purposes only and provided
"as-is", "with all faults" and "as available". There are no guarantees
for the accuracy or timeliness of information available from the service.