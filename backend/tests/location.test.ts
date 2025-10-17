import request from 'supertest';
import app from '../src/index';

describe('Location Endpoints', () => {
  describe('POST /api/search-location', () => {
    it('should search for location suggestions', async () => {
      const searchData = {
        lat: 28.4652382,
        lng: 77.0615957,
        query: 'delhi',
      };

      const response = await request(app)
        .post('/api/search-location')
        .send(searchData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('query', 'delhi');
      expect(response.body.data).toHaveProperty('coordinates');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/search-location')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid coordinates', async () => {
      const searchData = {
        lat: 999, // Invalid latitude
        lng: 77.0615957,
        query: 'delhi',
      };

      const response = await request(app)
        .post('/api/search-location')
        .send(searchData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

});
