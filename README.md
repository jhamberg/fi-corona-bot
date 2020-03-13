# COVID-2019 Finland - Telegram bot

You need a Telegram Bot API Authorization token to run this project:  
https://core.telegram.org/bots

## Running without Docker

```bash
# Clone the repository
git clone https://github.com/jhamberg/tg-corona.git
# Enter the directory
cd tg-corona/
# Install dependencies
npm install
# Add your API token
echo "TELEGRAM_API_TOKEN=your_token" > .env 
# Start
npm start
```

## Running with Docker
```bash
# Build the image
docker build -t tg-corona .
# Run
docker run -d -e TELEGRAM_API_TOKEN=your_token tg-corona 
```
---
The bot uses data from the 
[public coronavirus dataset](https://github.com/HS-Datadesk/koronavirus-avoindata) by HS.fi.
The service is for indicative purposes only and provided
"as-is", "with all faults" and "as available". There are no guarantees
for the accuracy or timeliness of information available from the service.