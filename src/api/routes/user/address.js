const { user_addresses } = require('../../models');

const getAddresses = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
    }

    const addresses = await user_addresses.findAll({
      where: { user_id: userId },
      order: [
        ['is_default', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    console.error('getAddresses error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to retrieve addresses',
    });
  }
};

const createAddress = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID not found',
      });
    }

    const {
      label = 'Home',
      recipient_name,
      recipient_phone,
      house_flat_floor,
      street_area,
      landmark,
      city = 'Bengaluru',
      state,
      pincode,
      formatted_address,
      latitude,
      longitude,
      is_default = false,
    } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude coordinates are required for the address location.',
      });
    }

    const count = await user_addresses.count({ where: { user_id: userId } });
    const shouldBeDefault = is_default || count === 0;

    if (shouldBeDefault) {
      // Unset previous defaults
      await user_addresses.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
    }

    const address = await user_addresses.create({
      user_id: userId,
      label: label || 'Home',
      recipient_name: recipient_name || null,
      recipient_phone: recipient_phone || null,
      house_flat_floor: house_flat_floor || null,
      street_area: street_area || null,
      landmark: landmark || null,
      city: city || 'Bengaluru',
      state: state || null,
      pincode: pincode || null,
      formatted_address: formatted_address || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      is_default: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      data: address,
    });
  } catch (error) {
    console.error('createAddress error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to create address',
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const address = await user_addresses.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized',
      });
    }

    const {
      label,
      recipient_name,
      recipient_phone,
      house_flat_floor,
      street_area,
      landmark,
      city,
      state,
      pincode,
      formatted_address,
      latitude,
      longitude,
      is_default,
    } = req.body;

    if (is_default === true) {
      await user_addresses.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
      address.is_default = true;
    } else if (is_default === false && address.is_default) {
      address.is_default = false;
    }

    if (label !== undefined) address.label = label;
    if (recipient_name !== undefined) address.recipient_name = recipient_name;
    if (recipient_phone !== undefined) address.recipient_phone = recipient_phone;
    if (house_flat_floor !== undefined) address.house_flat_floor = house_flat_floor;
    if (street_area !== undefined) address.street_area = street_area;
    if (landmark !== undefined) address.landmark = landmark;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;
    if (formatted_address !== undefined) address.formatted_address = formatted_address;
    if (latitude !== undefined && !isNaN(Number(latitude))) address.latitude = parseFloat(latitude);
    if (longitude !== undefined && !isNaN(Number(longitude))) address.longitude = parseFloat(longitude);

    await address.save();

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error) {
    console.error('updateAddress error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to update address',
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const address = await user_addresses.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized',
      });
    }

    const wasDefault = address.is_default;
    await address.destroy();

    // If deleted address was default, promote another address to default if available
    if (wasDefault) {
      const nextAddress = await user_addresses.findOne({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']],
      });
      if (nextAddress) {
        nextAddress.is_default = true;
        await nextAddress.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('deleteAddress error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to delete address',
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user?.user_id || req.headers?.user_id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const address = await user_addresses.findOne({
      where: { id, user_id: userId },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    await user_addresses.update(
      { is_default: false },
      { where: { user_id: userId } }
    );

    address.is_default = true;
    await address.save();

    return res.status(200).json({
      success: true,
      message: 'Default address updated',
      data: address,
    });
  } catch (error) {
    console.error('setDefaultAddress error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || error,
      message: 'Failed to set default address',
    });
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

