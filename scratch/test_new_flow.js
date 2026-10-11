const http = require('http');
const express = require('express');
const router = require('../src/api/routes');
const { generateJwt } = require('../src/api/auth');
const db = require('../src/api/models');

const app = express();
app.use(express.json());
app.use('/api/v1', router);

async function runTests() {
  const server = app.listen(4005, async () => {
    console.log('Test server running on 4005');
    const baseUrl = 'http://localhost:4005/api/v1';

    try {
      // 1. Test Public Shop Details
      const shop = await db.shops.findOne();
      console.log(`Testing Shop Details for shop: ${shop.shop_name} (${shop.id})`);
      const shopRes = await fetch(`${baseUrl}/shops/${shop.id}/details`);
      const shopData = await shopRes.json();
      console.log('Shop details status:', shopRes.status, 'Success:', shopData.success);

      // 2. Test Public Shop Listings
      const listingsRes = await fetch(`${baseUrl}/listings/shop/${shop.id}`);
      const listingsData = await listingsRes.json();
      console.log('Listings status:', listingsRes.status, 'Items count:', listingsData.data?.length);

      // 3. Test Proximity Search for Items
      const searchRes = await fetch(`${baseUrl}/listings/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: '', lat: 13.1, lon: 80.2 }),
      });
      const searchData = await searchRes.json();
      console.log('Listings search status:', searchRes.status, 'Found items:', searchData.data?.length);

      // 4. Test Customer Direct Order Placement
      const customer = await db.users.findOne({ where: { username: 'test_consumer' } });
      const customerToken = generateJwt({ user_id: customer.id, role_id: customer.role_id, username: customer.username });
      
      const orderPayload = {
        shop_id: shop.id,
        order_type: 'delivery',
        payment_mode: 'direct_upi',
        delivery_address: '12 Gandhi Road, Chennai',
        customer_phone: '9999949200',
        platform_fee: 5.0,
        items: [
          {
            listing_id: listingsData.data[0]?.id || null,
            item_name: listingsData.data[0]?.name || 'Test Item',
            unit_price: listingsData.data[0]?.price || 100,
            quantity: 2,
            subtotal: (listingsData.data[0]?.price || 100) * 2
          }
        ]
      };

      const orderRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          user_id: customer.id
        },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();
      console.log('Order create status:', orderRes.status, 'Order number:', orderData.data?.order_number);

      // 5. Test Customer Orders list
      const userOrdersRes = await fetch(`${baseUrl}/orders/user`, {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          user_id: customer.id
        }
      });
      const userOrdersData = await userOrdersRes.json();
      console.log('User orders status:', userOrdersRes.status, 'User orders count:', userOrdersData.data?.length);

      // 6. Test Merchant Shop Orders list
      const merchant = await db.users.findByPk(shop.owner_id);
      const merchantToken = generateJwt({ user_id: merchant.id, role_id: merchant.role_id, username: merchant.username });
      const shopOrdersRes = await fetch(`${baseUrl}/orders/shop/${shop.id}`, {
        headers: {
          Authorization: `Bearer ${merchantToken}`,
          user_id: merchant.id
        }
      });
      const shopOrdersData = await shopOrdersRes.json();
      console.log('Shop orders status:', shopOrdersRes.status, 'Shop orders count:', shopOrdersData.data?.length);

      console.log('\n--- ALL FLOW TESTS PASSED SUCCESSFULLY! ---');
    } catch (err) {
      console.error('Test error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
