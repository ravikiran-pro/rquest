const { shops, users } = require('../../models');


async function parseGoogleMapsUrl(googleMapsUrl) {
    let latitude = null, longitude = null;
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

const createShops = async (req, res) => {
    try {
        const shopDetails = req.body;

        const payload = {
            owner_id: req.headers.user_id,
            shop_name: shopDetails.shop_name,
            address: shopDetails.address,
            area: shopDetails.area,
            mobile_number: shopDetails.mobile_number,
            website: shopDetails.website,
            rating: (Math.random() * (5 - 0) + 0).toFixed(1),
            products_list: '',
            shop_type: shopDetails.shop_type,
            directions: shopDetails.directions,
        };

        parseGoogleMapsUrl(shopDetails.directions).then(async result => {
            const {latitude, longitude} = result;
            if(latitude && longitude){
                payload['latitude'] = latitude;
                payload['longitude'] = longitude;
                const createdShop = await shops.create(payload);

                const user = await users.update({ role_id: 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5' }, {
                    where: {
                        id: req.headers.user_id
                    }
                });


                res.status(201).json({ success: true, data: createdShop });
            }else{
                res.status(201).json({ success: false, error: 'Invalid direction url', message: 'Invalid direction url'  });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: true, error: error, message: 'Internal Server Error' });
    }
}

module.exports = { createShops }