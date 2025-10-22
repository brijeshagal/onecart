import request from 'supertest';
import app from '../src/index';

describe('Location Endpoints', () => {
  describe('GET /api/location/search', () => {
    it('should search for location suggestions', async () => {
      const response = await request(app)
        .get('/api/location/search')
        .query({
          lat: 28.4652382,
          lng: 77.0615957,
          query: 'delhi',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('query', 'delhi');
      expect(response.body.data).toHaveProperty('coordinates');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .get('/api/location/search');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app)
        .get('/api/location/search')
        .query({
          lat: 999, // Invalid latitude
          lng: 77.0615957,
          query: 'delhi',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

});
