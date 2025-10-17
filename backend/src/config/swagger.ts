import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OneCart API',
      version: '1.0.0',
      description: 'OneCart Backend API - Location search and user management',
      contact: {
        name: 'OneCart Team',
        email: 'support@onecart.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.onecart.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message',
                },
                statusCode: {
                  type: 'number',
                  example: 400,
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        SocialLogin: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
              enum: ['farcaster', 'twitter', 'discord', 'telegram'],
              example: 'farcaster',
            },
            username: {
              type: 'string',
              example: 'testuser123',
            },
            walletAddress: {
              type: 'string',
              example: '0x1234567890abcdef',
            },
          },
          required: ['platform', 'username'],
        },
        UserAddress: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Home',
            },
            address: {
              type: 'string',
              maxLength: 60,
              example: '123 Main Street, Apartment 4B',
            },
            floor: {
              type: 'string',
              example: '4th Floor',
            },
            landmark: {
              type: 'string',
              example: 'Near Central Park',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            save_as: {
              type: 'string',
              example: 'home',
            },
            latitude: {
              type: 'number',
              example: 28.4652382,
            },
            longitude: {
              type: 'number',
              example: 77.0615957,
            },
            is_default: {
              type: 'boolean',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
          required: [
            'name',
            'address',
            'floor',
            'landmark',
            'phone',
            'save_as',
          ],
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              example: 'testuser123',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'test@example.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            addresses: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/UserAddress',
              },
            },
            defaultAddressIndex: {
              type: 'number',
              example: 0,
            },
            receiveAddressIndex: {
              type: 'number',
              example: -1,
            },
            askBeforeReceiving: {
              type: 'boolean',
              example: true,
            },
            walletAddresses: {
              type: 'array',
              items: {
                type: 'string',
                example: '0x1234567890abcdef',
              },
            },
            farcasterWalletAddress: {
              type: 'number',
              example: -1,
            },
            primaryWalletIndex: {
              type: 'number',
              example: -1,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
          required: ['username', 'phone', 'addresses', 'walletAddresses'],
        },
        UIColor: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              example: 'black',
            },
            tint: {
              type: 'string',
              example: '900',
            },
          },
        },
        UIFont: {
          type: 'object',
          properties: {
            size: {
              type: 'string',
              example: '400',
            },
            weight: {
              type: 'string',
              example: 'medium',
            },
          },
        },
        UISuggestionText: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              example: 'Delhi, India',
            },
            color: {
              $ref: '#/components/schemas/UIColor',
            },
            font: {
              $ref: '#/components/schemas/UIFont',
            },
          },
        },
        UIImage: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example: 'https://example.com/image.png',
            },
          },
        },
        UISuggestionMeta: {
          type: 'object',
          properties: {
            place_id: {
              type: 'string',
              example: 'ChIJLQEq84deDTkR4vIaR2oNTpc',
            },
            session_token: {
              type: 'string',
              example: 'abc123',
            },
          },
        },
        UISuggestion: {
          type: 'object',
          properties: {
            title: {
              $ref: '#/components/schemas/UISuggestionText',
            },
            subtitle: {
              $ref: '#/components/schemas/UISuggestionText',
            },
            left_image: {
              $ref: '#/components/schemas/UIImage',
            },
            meta: {
              $ref: '#/components/schemas/UISuggestionMeta',
            },
          },
        },
        SearchLocationRequest: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              example: 28.4652382,
            },
            lng: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              example: 77.0615957,
            },
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'delhi',
            },
          },
          required: ['lat', 'lng', 'query'],
        },
        RegisterUserRequest: {
          type: 'object',
          properties: {
            socialLogins: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SocialLogin',
              },
              minItems: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'test@example.com',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            walletAddresses: {
              type: 'array',
              items: {
                type: 'string',
                example: '0x1234567890abcdef',
              },
            },
            addresses: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/UserAddress',
              },
              minItems: 1,
            },
            defaultAddressIndex: {
              type: 'number',
              minimum: -1,
              example: 0,
            },
            askBeforeReceiving: {
              type: 'boolean',
              example: true,
            },
            currentLatitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              example: 28.4652382,
            },
            currentLongitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              example: 77.0615957,
            },
          },
          required: ['socialLogins', 'phone', 'walletAddresses', 'addresses'],
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/middleware/*.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
