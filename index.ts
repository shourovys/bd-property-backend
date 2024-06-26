import cors from 'cors';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import QueryString from 'qs';
import connectDB from './src/lib/connectDB';
import PropertyItem from './src/models/PropertyItem';

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

connectDB();

app.get('/', (req: Request, res: Response) => {
  res.json('welcome to bd property');
});

// Route to fetch all properties with filters
app.get('/api/properties', async (req: Request, res: Response) => {
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

    const filters: any = {};

    if (queryParams.purpose) {
      filters['purpose.purpose.id'] = queryParams.purpose;
    }

    if (queryParams.status) {
      filters['purpose.subPurpose.id'] = queryParams.status;
    }

    if (queryParams.location && Array.isArray(queryParams.location)) {
      const isDhaka = queryParams.location.find(
        (location) => location === 'Dhaka'
      );
      if (!isDhaka) {
        filters['address.location'] = Array.isArray(queryParams.location)
          ? { $in: queryParams.location }
          : queryParams.location;
      }
    }

    if (queryParams.type) {
      filters['type.id'] = queryParams.type;
    }

    if (queryParams.subType) {
      filters['subType.id'] = queryParams.subType;
    }

    if (queryParams.bed) {
      filters.bed = Array.isArray(queryParams.bed)
        ? { $in: (queryParams.bed as string[]).map(Number) }
        : Number(queryParams.bed);
    }

    if (queryParams.bath) {
      filters.bath = Array.isArray(queryParams.bath)
        ? { $in: (queryParams.bath as string[]).map(Number) }
        : Number(queryParams.bath);
    }

    if (queryParams.priceMin && queryParams.priceMax) {
      filters.price = {
        $gte: Number(queryParams.priceMin),
        $lte: Number(queryParams.priceMax),
      };
    }

    if (queryParams.areaMin && queryParams.areaMax) {
      filters.size = {
        $gte: Number(queryParams.areaMin),
        $lte: Number(queryParams.areaMax),
      };
    }

    if (queryParams.keyword) {
      filters.keywords = Array.isArray(queryParams.keyword)
        ? { $in: queryParams.keyword }
        : queryParams.keyword;
    }

    if (queryParams.tour === 'video') {
      filters.video = { $ne: null };
    }

    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === null) {
        delete filters[key];
      }
    });

    console.log('Filters:', filters);

    const sort: any = {};
    if (queryParams.sort) {
      switch (queryParams.sort) {
        case 'popular':
          // sort.popularity = -1; // Assuming there's a popularity field
          break;
        case 'newest':
          sort.createdAt = -1; // Assuming there's a createdAt field
          break;
        case 'lowestPrice':
          sort.price = 1;
          break;
        case 'highestPrice':
          sort.price = -1;
          break;
        default:
          break;
      }
    }

    const properties = await PropertyItem.find(filters)
      .select('id referenceNo title size price bed bath status address images')
      .sort(sort)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .exec();

    const totalProperties = await PropertyItem.countDocuments(filters);
    console.log('🚀 ~ app.get ~ totalProperties:', totalProperties);

    res.json({
      success: true,
      message: '',
      page: parsedPage,
      limit: parsedLimit,
      count: totalProperties,
      results: properties,
    });
  } catch (error) {
    console.log('Error fetching properties:', error);
    res.json({
      success: false,
      message: 'Failed to fetch properties',
    });
  }
});

// Route to fetch a single property by ID
// Route to fetch a single property by ID and 3 related properties
app.get('/api/properties/:id', async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.id;
    const property = await PropertyItem.findById(propertyId).exec();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Find 3 related properties based on type or location
    const relatedProperties = await PropertyItem.find({
      _id: { $ne: propertyId },
      'type.id': property.type.id,
      'subType.id': property.subType.id,
      // 'address.location': property.address.location,
      // 'purpose.purpose.id': property.purpose.purpose.id,
    })
      .select('id referenceNo title size price bed bath status address images')
      .limit(3)
      .exec();

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
