import * as swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OneCart API',
      version: '1.0.0',
      description: 'OneCart Backend API - E-commerce integration with Blinkit India. Provides location search, user management, product feeds, and search functionality.',
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
          description: 'Farcaster social login information (currently the only supported platform)',
          properties: {
            farcaster: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'alice' },
                walletAddress: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
              },
            },
          },
        },
        UserAddress: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB ObjectId of the address subdocument',
              example: '507f1f77bcf86cd799439011',
            },
            name: { type: 'string', example: 'Home' },
            label: { type: 'string', example: 'Saved Address' },
            label_id: { type: 'string', example: 'home' },
            line1: { type: 'string', example: '123 Main Street' },
            line2: { type: 'string', example: 'Apartment 4B' },
            display_address: {
              type: 'string',
              example: '123 Main Street, Apartment 4B, New Delhi',
            },
            landmark: { type: 'string', example: 'Near Central Park' },
            latitude: { type: 'number', example: 28.4652382 },
            longitude: { type: 'number', example: 77.0615957 },
            use_corrected_location: { type: 'boolean', example: true },
            install_ts: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            update_ts: { type: 'string', example: '2024-01-02T00:00:00.000Z' },
            corrected_location_info: {
              type: 'object',
              properties: {
                confidence: { type: 'string', example: 'high' },
                landmark: { type: 'string', example: 'Park Entry' },
                latitude: { type: 'number', example: 28.4652382 },
                longitude: { type: 'number', example: 77.0615957 },
              },
            },
            location_info: {
              type: 'object',
              properties: {
                state: { type: 'string', example: 'Delhi' },
                postal_code: { type: 'string', example: '110001' },
                city: { type: 'string', example: 'New Delhi' },
              },
            },
            address_meta: {
              type: 'object',
              properties: {
                source: { type: 'string', example: 'user' },
                source_ref_id: { type: 'string', example: 'user_123' },
              },
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 28.4652382 },
                longitude: { type: 'number', example: 77.0615957 },
              },
            },
            coordinates: {
              type: 'object',
              properties: {
                lat: { type: 'number', example: 28.4652382 },
                lon: { type: 'number', example: 77.0615957 },
              },
            },
            address_details_info: {
              type: 'object',
              properties: {
                tower: { type: 'string', example: 'A' },
                house: { type: 'string', example: '12' },
                floor: { type: 'string', example: '4' },
                phone: { type: 'string', example: '+1234567890' },
                landmark: { type: 'string', example: 'Near Central Park' },
                tags: { type: 'string', example: 'home' },
                template_id: { type: 'number', example: 1 },
                alias_id: { type: 'number', example: 0 },
                name: { type: 'string', example: 'Home' },
              },
            },
            ui_data: {
              type: 'object',
              properties: {
                left_image: { type: 'string', example: 'https://example.com/img.png' },
                distance: { type: 'string', example: '1.2 km' },
                is_share_address_enabled: { type: 'boolean', example: false },
              },
            },
          },
          required: [
            'name',
            'label',
            'label_id',
            'line1',
            'line2',
            'display_address',
            'landmark',
            'latitude',
            'longitude',
            'use_corrected_location',
            'install_ts',
            'update_ts',
            'corrected_location_info',
            'location_info',
            'address_meta',
            'location',
            'coordinates',
            'address_details_info',
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
          description: 'Register user payload. Provide username or socialLogins (at least one).',
          properties: {
            socialLogins: {
              description: 'Optional Farcaster login object',
              $ref: '#/components/schemas/SocialLogin',
            },
            username: {
              type: 'string',
              description: 'Required username, required if socialLogins is omitted',
              example: 'alice',
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
              description: 'Array of Blinkit AddressData objects captured via location flow',
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
            receiveAddressIndex: {
              type: 'number',
              minimum: -1,
              example: 0,
            },
            askBeforeReceiving: {
              type: 'boolean',
              example: true,
            },
            farcasterWalletAddress: {
              type: 'number',
              description: 'Index of farcaster-linked wallet if any, -1 otherwise',
              example: -1,
            },
            primaryWalletIndex: {
              type: 'number',
              description: 'Index of the primary wallet in walletAddresses',
              example: 0,
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
          required: ['phone', 'walletAddresses', 'addresses'],
          oneOf: [
            {
              required: ['username'],
            },
            {
              properties: {
                socialLogins: {
                  type: 'array',
                  minItems: 1,
                },
              },
              required: ['socialLogins'],
            },
          ],
          example: {
            username: 'alice',
            socialLogins: { farcaster: { username: 'alice', walletAddress: '0x1234567890abcdef1234567890abcdef12345678' } },
            email: 'alice@example.com',
            phone: '+11234567890',
            walletAddresses: ['0x1234567890abcdef1234567890abcdef12345678'],
            addresses: [
              {
                name: 'Home',
                label: 'Saved Address',
                label_id: 'home',
                line1: '123 Main Street',
                line2: 'Apartment 4B',
                display_address: '123 Main Street, Apartment 4B, New Delhi',
                landmark: 'Near Central Park',
                latitude: 28.4652382,
                longitude: 77.0615957,
                use_corrected_location: true,
                install_ts: '2024-01-01T00:00:00.000Z',
                update_ts: '2024-01-02T00:00:00.000Z',
                corrected_location_info: {
                  confidence: 'high',
                  landmark: 'Park Entry',
                  latitude: 28.4652382,
                  longitude: 77.0615957,
                },
                location_info: {
                  state: 'Delhi',
                  postal_code: '110001',
                  city: 'New Delhi',
                },
                address_meta: {
                  source: 'user',
                  source_ref_id: 'user_123',
                },
                location: {
                  latitude: 28.4652382,
                  longitude: 77.0615957,
                },
                coordinates: {
                  lat: 28.4652382,
                  lon: 77.0615957,
                },
                address_details_info: {
                  tower: 'A',
                  house: '12',
                  floor: '4',
                  phone: '+11234567890',
                  landmark: 'Near Central Park',
                  tags: 'home',
                  template_id: 1,
                  alias_id: 0,
                  name: 'Home',
                },
                ui_data: {
                  left_image: 'https://example.com/img.png',
                  distance: '1.2 km',
                  is_share_address_enabled: false,
                },
              },
            ],
            defaultAddressIndex: 0,
            receiveAddressIndex: 0,
            askBeforeReceiving: true,
            farcasterWalletAddress: -1,
            primaryWalletIndex: 0,
            currentLatitude: 28.4652382,
            currentLongitude: 77.0615957,
          },
        },
        // TODO: Add FeedProduct and FeedSection schemas when implementing actual Blinkit integration
        SearchItemsRequest: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID to resolve default/selected address context',
              example: '664f1f77bcf86cd799439011',
            },
            receiverUsername: {
              type: 'string',
              example: 'john_doe',
            },
            lat: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              example: 28.7041,
            },
            lng: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              example: 77.1025,
            },
            presetAddressId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            newAddress: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'Home',
                },
                address: {
                  type: 'string',
                  example: '123 Main Street',
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
                saveAs: {
                  type: 'string',
                  example: 'home',
                },
              },
              required: ['name', 'address', 'phone', 'saveAs'],
            },
            query: {
              type: 'string',
              minLength: 1,
              example: 'milk',
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              example: 0,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
              example: 20,
            },
          },
          required: ['query'],
        },
        SearchItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'item-123',
            },
            name: {
              type: 'string',
              example: 'Fresh Milk 1L',
            },
            price: {
              type: 'number',
              example: 60,
            },
            image: {
              type: 'string',
              example: '/images/milk.jpg',
            },
            category: {
              type: 'string',
              example: 'Dairy & Eggs',
            },
            brand: {
              type: 'string',
              example: 'Amul',
            },
            inStock: {
              type: 'boolean',
              example: true,
            },
            rating: {
              type: 'number',
              example: 4.2,
            },
            discount: {
              type: 'number',
              example: 10,
            },
          },
          required: ['id', 'name', 'price', 'image', 'category', 'inStock'],
        },
        FeedRequest: {
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
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              example: 0,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
              example: 20,
            },
          },
          required: ['lat', 'lng'],
        },
        SearchItemsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/SearchItem',
                  },
                },
                searchQuery: {
                  type: 'string',
                  example: 'milk',
                },
                pagination: {
                  type: 'object',
                  properties: {
                    offset: {
                      type: 'number',
                    },
                    limit: {
                      type: 'number',
                    },
                    total: {
                      type: 'number',
                    },
                    hasMore: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
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

export const swaggerSpec = swaggerJSDoc.default(options);
