const http = require('http');

const trackIp = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const apiKey = '598e0deaeb114a598b4e243fe2f7b1ca'; // Replace with your actual API key

    // Make an HTTP GET request to the OpenCage Geocoding API
    const options = {
      hostname: 'api.opencagedata.com',
      path: `/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`,
      method: 'GET',
    };

    const request = http.request(options, (response) => {
      let data = '';

      // A chunk of data has been received.
      response.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received.
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);

          // Extract relevant information from the OpenCage response
          const firstResult = parsedData.results[0];
          const { city, county, country } = firstResult.components;

          res.json({ city, region: county, country });
        } catch (error) {
          console.error('Error parsing response data:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    });

    // Handle errors
    request.on('error', (error) => {
      console.error('Error making HTTP request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });

    request.end();
  } catch (error) {
    console.error('Error getting user location:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { trackIp };
