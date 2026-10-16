const { shops, users, shop_listings } = require('../../models');

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
    if (!map_link) {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction url',
        message: 'Map link is required',
      });
    }
    const result = await parseGoogleMapsUrl(map_link);
    const { latitude, longitude } = result;
    if (latitude && longitude) {
      return res.status(200).json({
        success: true,
        data: {
          latitude: latitude,
          longitude: longitude,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction url',
        message: 'Invalid direction url',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Invalid direction url',
    });
  }
};

const createShops = async (req, res) => {
  try {
    const shopDetails = req.body;
    const { user_id } = req.headers;

    let existingShop = null;
    if (shopDetails.shop_id) {
      existingShop = await shops.findByPk(shopDetails.shop_id);
    }

    let latitude =
      parseFloat(shopDetails.latitude) ||
      parseFloat(shopDetails.lat) ||
      (existingShop ? existingShop.latitude : null);
    let longitude =
      parseFloat(shopDetails.longitude) ||
      parseFloat(shopDetails.lon) ||
      (existingShop ? existingShop.longitude : null);

    if ((!latitude || !longitude) && shopDetails.directions) {
      const result = await parseGoogleMapsUrl(shopDetails.directions);
      if (result.latitude && result.longitude) {
        latitude = result.latitude;
        longitude = result.longitude;
      }
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Location required',
        message:
          'Please select a location on the map or provide a valid directions URL.',
      });
    }

    const payload = {
      owner_id: existingShop ? existingShop.owner_id : user_id,
      shop_name: shopDetails.shop_name || (existingShop ? existingShop.shop_name : ''),
      address: shopDetails.address || (existingShop ? existingShop.address : ''),
      area: shopDetails.area || (existingShop ? existingShop.area : ''),
      img_url: shopDetails.img_url || (existingShop ? existingShop.img_url : ''),
      mobile_number: shopDetails.mobile_number || (existingShop ? existingShop.mobile_number : ''),
      website: shopDetails.website !== undefined ? shopDetails.website : (existingShop ? existingShop.website : ''),
      rating:
        shopDetails.rating ||
        (existingShop ? existingShop.rating : parseFloat((Math.random() * (5 - 3.5) + 3.5).toFixed(1))),
      products_list:
        typeof shopDetails.products_list === 'string'
          ? shopDetails.products_list
          : (existingShop ? existingShop.products_list : ''),
      shop_type: shopDetails.shop_type || (existingShop ? existingShop.shop_type : ''),
      category_id: shopDetails.category_id !== undefined ? (shopDetails.category_id ? parseInt(shopDetails.category_id) : null) : (existingShop ? existingShop.category_id : null),
      sub_category_id: shopDetails.sub_category_id !== undefined ? (shopDetails.sub_category_id ? parseInt(shopDetails.sub_category_id) : null) : (existingShop ? existingShop.sub_category_id : null),
      allow_multi_category:
        shopDetails.allow_multi_category !== undefined
          ? Boolean(shopDetails.allow_multi_category)
          : (existingShop ? existingShop.allow_multi_category : false),
      directions:
        shopDetails.directions ||
        `https://www.google.com/maps/@${latitude},${longitude}`,
      latitude: latitude,
      longitude: longitude,
    };

    let createdShop = null;
    if (shopDetails.shop_id) {
      await shops.update(payload, {
        where: {
          id: shopDetails.shop_id,
        },
      });
      createdShop = await shops.findByPk(shopDetails.shop_id);
    } else {
      createdShop = await shops.create(payload);

      await users.update(
        { role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5' },
        {
          where: {
            id: user_id,
          },
        }
      );
    }

    return res.status(201).json({ success: true, data: createdShop });
  } catch (error) {
    console.error('Error creating/updating shop:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Internal Server Error',
    });
  }
};

const deleteShop = async (req, res) => {
  try {
    const { shop_id } = req.params;
    const { user_id, role_id } = req.headers;

    const shop = await shops.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Ensure owner or admin
    if (shop.owner_id !== user_id && role_id !== 'd5e858d8-636c-4fc3-8c3a-0a76131c95e9') {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this shop' });
    }

    // Delete associated listings first
    await shop_listings.destroy({ where: { shop_id } });
    await shop.destroy();

    return res.status(200).json({
      success: true,
      message: 'Shop and associated listings deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shop:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Internal Server Error',
    });
  }
};

module.exports = { createShops, linkDecode, deleteShop };
