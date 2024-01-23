const { shops, users } = require('../../models');

async function parseGoogleMapsUrl(googleMapsUrl) {
  let latitude = null,
    longitude = null;
  try {
    const response = await fetch(googleMapsUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const url = await response.url;
    const pattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(pattern);

    if (match) {
      latitude = parseFloat(match[1]);
      longitude = parseFloat(match[2]);
    }

    return { latitude, longitude };
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return { latitude, longitude };
  }
}

const linkDecode = async (req, res) => {
  try {
    const { map_link } = req.body;
    parseGoogleMapsUrl(map_link).then(async (result) => {
      const { latitude, longitude } = result;
      if (latitude && longitude) {
        res.status(201).json({
          success: true,
          data: {
            latitude: latitude,
            longitude: longitude,
          },
        });
      } else {
        res.status(201).json({
          success: false,
          error: 'Invalid direction url',
          message: 'Invalid direction url',
        });
      }
    });
  } catch (error) {
    res.status(201).json({
      success: false,
      error: 'Invalid direction url',
      message: 'Invalid direction url',
    });
  }
};

const createShops = async (req, res) => {
  try {
    const shopDetails = req.body;
    const { user_id } = req.headers;

    const payload = {
      owner_id: user_id,
      shop_name: shopDetails.shop_name,
      address: shopDetails.address,
      area: shopDetails.area,
      img_url: shopDetails.img_url,
      mobile_number: shopDetails.mobile_number,
      website: shopDetails.website,
      rating: (Math.random() * (5 - 0) + 0).toFixed(1),
      products_list: '',
      shop_type: shopDetails.shop_type,
      category_id: shopDetails.category_id,
      sub_category_id: shopDetails.sub_category_id,
      directions: shopDetails.directions,
      latitude: shopDetails.latitude,
      longitude: shopDetails.longitude,
    };

    // if (!payload?.latitude && !payload?.longitude) {
    parseGoogleMapsUrl(shopDetails.directions).then(async (result) => {
      const { latitude, longitude } = result;
      if (latitude && longitude) {
        payload['latitude'] = latitude;
        payload['longitude'] = longitude;
        const createdShop = await shops.create(payload);

        await users.update(
          { role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5' },
          {
            where: {
              id: user_id,
            },
          }
        );

        res.status(201).json({ success: true, data: createdShop });
      } else {
        res.status(201).json({
          success: false,
          error: 'Invalid direction url',
          message: 'Invalid direction url',
        });
      }
    });
    // }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: true, error: error, message: 'Internal Server Error' });
  }
};

module.exports = { createShops, linkDecode };
