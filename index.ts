import cors from 'cors';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import QueryString from 'qs';
import fs from 'fs';
import path from 'path';

// Load mock properties
const propertiesFilePath = path.join(__dirname, 'properties.json');
let mockProperties: any[] = [];
try {
  mockProperties = JSON.parse(fs.readFileSync(propertiesFilePath, 'utf8'));
} catch (err) {
  console.error('Error reading mock properties:', err);
}

const app = express();

// Detailed CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://bd-property-shourov.vercel.app'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware for setting headers including Referrer-Policy
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.json('welcome to bd property');
});

// Route to fetch all properties with filters
app.get('/api/properties', (req: Request, res: Response) => {
  try {
    const searchQuery = req.url?.split('?')[1];
    const queryParams = QueryString.parse(searchQuery, {
      ignoreQueryPrefix: true,
    });

    let parsedPage = 1;
    let parsedLimit = 20;

    if (queryParams.page && typeof queryParams.page === 'string') {
      parsedPage = parseInt(queryParams.page, 10);
    }

    if (queryParams.limit && typeof queryParams.limit === 'string') {
      parsedLimit = parseInt(queryParams.limit, 10);
    }

    // Apply filters
    let filteredProperties = mockProperties.filter((property) => {
      let isMatch = true;

      if (queryParams.purpose && property.purpose?.purpose?.id !== queryParams.purpose) {
        isMatch = false;
      }
      if (queryParams.status && property.status !== queryParams.status && property.purpose?.subPurpose?.id !== queryParams.status) {
        // Fallback for mock data status mismatch with previous structure
        if (property.status !== queryParams.status) isMatch = false;
      }

      if (queryParams.location && Array.isArray(queryParams.location)) {
        const locations = queryParams.location as string[];
        const isDhaka = locations.find((loc) => loc?.toLowerCase() === 'dhaka');
        if (!isDhaka) {
          const locMatched = locations.some((loc) =>
            property.address?.location?.toLowerCase().includes(loc.toLowerCase())
          );
          if (!locMatched) {
            isMatch = false;
          }
        }
      } else if (queryParams.location && typeof queryParams.location === 'string' && queryParams.location.toLowerCase() !== 'dhaka') {
        if (!property.address?.location?.toLowerCase().includes(queryParams.location.toLowerCase())) {
          isMatch = false;
        }
      }

      if (queryParams.type && property.type?.id !== queryParams.type) {
        isMatch = false;
      }
      if (queryParams.subType && property.subType?.id !== queryParams.subType) {
        isMatch = false;
      }

      if (queryParams.bed) {
        const beds = Array.isArray(queryParams.bed) ? queryParams.bed.map(Number) : [Number(queryParams.bed)];
        if (!beds.includes(property.bed)) isMatch = false;
      }

      if (queryParams.bath) {
        const baths = Array.isArray(queryParams.bath) ? queryParams.bath.map(Number) : [Number(queryParams.bath)];
        if (!baths.includes(property.bath)) isMatch = false;
      }

      if (queryParams.priceMin) {
        if (property.price < Number(queryParams.priceMin)) {
          isMatch = false;
        }
      }
      
      if (queryParams.priceMax) {
        if (property.price > Number(queryParams.priceMax)) {
          isMatch = false;
        }
      }

      if (queryParams.areaMin) {
        if (property.size < Number(queryParams.areaMin)) {
          isMatch = false;
        }
      }
      
      if (queryParams.areaMax) {
        if (property.size > Number(queryParams.areaMax)) {
          isMatch = false;
        }
      }

      if (queryParams.keyword) {
        const keywords = Array.isArray(queryParams.keyword) ? queryParams.keyword : [queryParams.keyword];
        const propertyKeywords = property.keywords || [];
        const hasKeyword = keywords.some((kw: any) => propertyKeywords.includes(kw));
        if (!hasKeyword) isMatch = false;
      }

      if (queryParams.tour === 'video' && !property.video) {
        isMatch = false;
      }

      return isMatch;
    });

    // Apply sorting
    if (queryParams.sort) {
      switch (queryParams.sort) {
        case 'newest':
          filteredProperties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'lowestPrice':
          filteredProperties.sort((a, b) => a.price - b.price);
          break;
        case 'highestPrice':
          filteredProperties.sort((a, b) => b.price - a.price);
          break;
        default:
          break;
      }
    }

    const totalProperties = filteredProperties.length;

    // Apply pagination
    const paginatedProperties = filteredProperties.slice(
      (parsedPage - 1) * parsedLimit,
      parsedPage * parsedLimit
    );

    res.json({
      success: true,
      message: '',
      page: parsedPage,
      limit: parsedLimit,
      count: totalProperties,
      results: paginatedProperties,
    });
  } catch (error) {
    console.log('Error fetching properties:', error);
    res.json({
      success: false,
      message: 'Failed to fetch properties',
    });
  }
});

// Route to fetch a single property by ID and 3 related properties
app.get('/api/properties/:id', (req: Request, res: Response) => {
  try {
    const propertyId = req.params.id;
    const property = mockProperties.find(p => p.id === propertyId || p._id === propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Find 3 related properties based on type or subType
    const relatedProperties = mockProperties.filter(
      p => p.id !== propertyId && (p.type?.id === property.type?.id || p.subType?.id === property.subType?.id)
    ).slice(0, 3);

    res.json({
      success: true,
      message: '',
      results: { details: property, related: relatedProperties },
    });
  } catch (error) {
    console.log('Error fetching property:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
