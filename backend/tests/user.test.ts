import request from 'supertest';
import app from '../src/index';

describe('User Endpoints', () => {
  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        socialLogins: [
          {
            platform: 'farcaster',
            username: 'testuser123',
          },
        ],
        email: 'test@example.com',
        phone: '+1234567890',
        walletAddresses: ['0x1234567890abcdef'],
        addresses: [
          {
            name: 'Home',
            address: '123 Main St',
            floor: '2nd Floor',
            landmark: 'Near Park',
            phone: '+1234567890',
            save_as: 'home',
          },
        ],
        defaultAddressIndex: 0,
        askBeforeReceiving: true,
        currentLatitude: 28.4652382,
        currentLongitude: 77.0615957,
      };

      const response = await request(app).post('/api/register').send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('username', 'testuser123');
      expect(response.body.data.user).toHaveProperty('phone', '+1234567890');
      expect(response.body.data.user).toHaveProperty('addresses');
      expect(response.body.data.user.addresses).toHaveLength(1);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/register').send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate username', async () => {
      const userData = {
        socialLogins: [
          {
            platform: 'farcaster',
            username: 'duplicateuser',
          },
        ],
        phone: '+1234567890',
        walletAddresses: ['0x1234567890abcdef'],
        addresses: [
          {
            name: 'Home',
            address: '123 Main St',
            floor: '2nd Floor',
            landmark: 'Near Park',
            phone: '+1234567890',
            save_as: 'home',
          },
        ],
      };

      // Register first user
      await request(app).post('/api/register').send(userData);

      // Try to register with same username
      const response = await request(app).post('/api/register').send(userData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
