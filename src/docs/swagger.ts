/**
 * OpenAPI 3 document for Swagger UI.
 * Kept hand-written for precision — swagger-jsdoc annotations are optional add-ons.
 */
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AuraAI Backend API',
    version: '1.0.0',
    description:
      'AuraAI Makeup Intelligence API — SUPER_ADMIN manages affiliators; AFFILIATOR manages own products; public guest scan; SOCO makeup catalog and recommendations.',
    contact: { name: 'AuraAI Engineering' },
  },
  servers: [{ url: '/', description: 'Current host' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
        },
      },
      Affiliator: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', example: 'AFFILIATOR' },
          isActive: { type: 'boolean' },
          name: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateAffiliatorRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Min 8 chars, must include a letter and a number',
          },
          name: { type: 'string' },
          isActive: { type: 'boolean', default: true },
        },
      },
      UpdateAffiliatorRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      ScanResponse: {
        type: 'object',
        properties: {
          analysis: {
            type: 'object',
            properties: {
              skinTone: { type: 'string', example: 'Light' },
              undertone: { type: 'string', example: 'Warm' },
              faceShape: { type: 'string', example: 'Oval' },
              confidence: { type: 'number', example: 0.91 },
              skinType: { type: 'string', nullable: true, example: 'Oily' },
              concerns: {
                type: 'array',
                items: { type: 'string' },
                example: ['acne', 'oily'],
              },
            },
          },
          recommendation: {
            type: 'object',
            properties: {
              makeupTypes: { type: 'array', items: { type: 'object' } },
              products: {
                type: 'array',
                description: 'Top ranked products with matchScore + explanations + affiliateUrl',
                items: { type: 'object' },
              },
            },
          },
          scanId: { type: 'string', format: 'uuid' },
          recommendationId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          '200': { description: 'Health status' },
        },
      },
    },
    '/affiliators': {
      get: {
        tags: ['Affiliators'],
        summary: 'List affiliators (SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Affiliator list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Affiliator' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — SUPER_ADMIN only' },
        },
      },
      post: {
        tags: ['Affiliators'],
        summary: 'Create affiliator (SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAffiliatorRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Affiliator' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — SUPER_ADMIN only' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/affiliators/{id}': {
      get: {
        tags: ['Affiliators'],
        summary: 'Get affiliator by id (SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Affiliator',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Affiliator' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — SUPER_ADMIN only' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Affiliators'],
        summary: 'Update affiliator (SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAffiliatorRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — SUPER_ADMIN only' },
          '404': { description: 'Not found' },
          '409': { description: 'Email already registered' },
        },
      },
      delete: {
        tags: ['Affiliators'],
        summary: 'Deactivate affiliator (SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Deactivated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — SUPER_ADMIN only' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registered' },
          '409': { description: 'Email taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Tokens issued' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'New tokens' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Always succeeds (anti-enumeration)' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Password updated' } },
      },
    },
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile' } },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updated profile' } },
      },
    },
    '/scan/public': {
      post: {
        tags: ['Scan'],
        summary: 'Public follower scan (no login)',
        description:
          'Guest selfie via affiliator referral link. Multipart: image, affiliatorId, optional guestName, optional channel (referral|qr).',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image', 'affiliatorId'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  affiliatorId: { type: 'string', format: 'uuid' },
                  guestName: { type: 'string' },
                  channel: { type: 'string', enum: ['referral', 'qr'], default: 'referral' },
                  trainingConsent: {
                    type: 'string',
                    description:
                      'true/false — if true, selfie is kept for adaptive AI training corpus',
                    enum: ['true', 'false'],
                    default: 'false',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Analysis + product matches' },
          '400': { description: 'Missing image or affiliatorId' },
          '404': { description: 'Affiliator not found' },
        },
      },
    },
    '/scan/public/{id}': {
      get: {
        tags: ['Scan'],
        summary: 'Get a public scan result (no login)',
        description: 'Guest results page. Optional affiliatorId must match the scan owner.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'affiliatorId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Analysis + product matches' },
          '404': { description: 'Scan not found' },
        },
      },
    },
    '/scan': {
      post: {
        tags: ['Scan'],
        summary: 'Upload selfie and run analysis pipeline',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Analysis + recommendations',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ScanResponse' },
              },
            },
          },
        },
      },
    },
    '/scan/leads': {
      get: {
        tags: ['Scan'],
        summary: 'List affiliator scan leads',
        description:
          'Followers who scanned via the affiliator referral link. Includes analysis summary and top matched product.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search guest, analysis, or product' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: 'Paginated scan leads' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/scan/leads/{id}': {
      get: {
        tags: ['Scan'],
        summary: 'Get one scan lead with matched products',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Scan id',
          },
        ],
        responses: {
          '200': { description: 'Lead detail' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/scan/history': {
      get: {
        tags: ['History'],
        summary: 'List scan history',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'History list' } },
      },
    },
    '/recommendation/latest': {
      get: {
        tags: ['Recommendation'],
        summary: 'Latest recommendation for the user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Recommendation' } },
      },
    },
    '/products': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'List makeup products',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string', example: 'Lips' } },
          { name: 'subcategory', in: 'query', schema: { type: 'string', example: 'Lip Cream' } },
          { name: 'brand', in: 'query', schema: { type: 'string', example: 'Wardah' } },
          { name: 'finish', in: 'query', schema: { type: 'string', example: 'matte' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 200 } },
        ],
        responses: { '200': { description: 'Makeup catalog' } },
      },
      post: {
        tags: ['Makeup Catalog'],
        summary: 'Create product (AFFILIATOR / SUPER_ADMIN)',
        description: 'Affiliator products are owned by the caller (ownerId).',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Created' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/products/mine': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'List my products (AFFILIATOR)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Owned products' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/products/research': {
      post: {
        tags: ['Makeup Catalog'],
        summary: 'Search catalog, SOCO, then AI web-research if empty',
        description:
          'Looks up the query in the database first, then the SOCO/Sociolla catalog API for product photos. If still empty, OpenAI web research extracts facts and attaches SOCO images when a match exists.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', example: 'skintific 5x ceramide' },
                  save: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Database hits or newly researched product' },
          '401': { description: 'Unauthorized' },
          '502': { description: 'OpenAI research failed' },
        },
      },
    },
    '/products/{id}/adopt': {
      post: {
        tags: ['Makeup Catalog'],
        summary: 'Copy a catalog product into my affiliator catalog',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '201': { description: 'Copied to my catalog' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'Get product by id',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Product' },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Makeup Catalog'],
        summary: 'Update product (AFFILIATOR own / SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Updated' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Makeup Catalog'],
        summary: 'Soft-delete product (AFFILIATOR own / SUPER_ADMIN)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/products/categories': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'List makeup categories (Face, Lips, Eyes, …)',
        responses: { '200': { description: 'Categories' } },
      },
    },
    '/products/brands': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'List makeup brands',
        responses: { '200': { description: 'Brands' } },
      },
    },
    '/ingredients': {
      get: {
        tags: ['Makeup Catalog'],
        summary: 'Makeup type taxonomy (Foundation, Concealer, …)',
        responses: { '200': { description: 'Makeup types' } },
      },
    },
    '/users/me': {
      get: {
        tags: ['User'],
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User' } },
      },
    },
    '/analytics': {
      get: {
        tags: ['Analytics'],
        summary: 'Affiliator analytics dashboard (scans, matches, undertones, products)',
        description:
          'Aggregates scan + recommendation data for the logged-in affiliator. Estimated revenue is not included. SUPER_ADMIN may pass affiliatorId.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'range',
            in: 'query',
            schema: { type: 'string', enum: ['7d', '30d', '90d'], default: '7d' },
          },
          {
            name: 'affiliatorId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'SUPER_ADMIN only',
          },
        ],
        responses: {
          '200': { description: 'Analytics dashboard payload' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
    '/usage': {
      get: {
        tags: ['Usage'],
        summary: 'Affiliator quota usage dashboard',
        description:
          'Current plan, remaining scan credits, 14-day trend, weekly usage, and referral vs QR split for the active billing period.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Usage dashboard payload' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/usage/checkout': {
      post: {
        tags: ['Usage'],
        summary: 'Simulate plan checkout and add scan credits',
        description:
          'Marks the payment as paid (no payment gateway yet), activates or extends the affiliator subscription, and adds the pack quota.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId'],
                properties: {
                  planId: { type: 'string', enum: ['starter', 'growth', 'scale'] },
                  method: { type: 'string', enum: ['qris', 'va', 'ewallet'], default: 'qris' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Payment recorded and credits added' },
          '401': { description: 'Unauthorized' },
          '422': { description: 'Invalid plan' },
        },
      },
    },
    '/billing': {
      get: {
        tags: ['Billing'],
        summary: 'Current plan, payment method, and included usage',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Billing overview' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/billing/spending': {
      get: {
        tags: ['Billing'],
        summary: 'Month-to-date and historical spending from payments',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Spending dashboard' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/billing/invoices': {
      get: {
        tags: ['Billing'],
        summary: 'List affiliator invoices',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Invoice list' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/billing/invoices/{invoiceNumber}': {
      get: {
        tags: ['Billing'],
        summary: 'Invoice detail',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'invoiceNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Invoice detail' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Invoice not found' },
        },
      },
    },
    '/analytics/overview': {
      get: {
        tags: ['Analytics'],
        summary: 'Home dashboard overview (KPIs, recent leads, top products, funnel, usage)',
        description:
          'Single payload for the Overview page. No estimated revenue. Period = last 30 days; weekTrends = Mon–Sun this week; usage = calendar month plus remaining credits; affiliatorId for the public scan link.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'affiliatorId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'SUPER_ADMIN only',
          },
        ],
        responses: {
          '200': { description: 'Overview payload' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Affiliators', description: 'SUPER_ADMIN only — manage affiliator accounts' },
    { name: 'User' },
    { name: 'Profile' },
    { name: 'Scan' },
    { name: 'History' },
    { name: 'Recommendation' },
    { name: 'Makeup Catalog' },
    { name: 'Analytics', description: 'Affiliator performance from scans & matches (no revenue)' },
    { name: 'Usage', description: 'Scan credit packs, quota dashboard, and simulated checkout' },
    { name: 'Billing', description: 'Plan, spending, payment method, and invoices' },
  ],
} as const;
