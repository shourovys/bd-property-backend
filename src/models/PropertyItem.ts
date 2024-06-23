import mongoose, { Document, Schema } from 'mongoose';

interface PropertyItem extends Document {
  purpose: {
    purpose: {
      id: string;
      name: string;
    };
  };
  status: string;
  address: {
    location: string;
  };
  type: {
    id: string;
    name: string;
  };
  subType: {
    id: string;
    name: string;
  };
  bed: number;
  bath: number;
  price: number;
  size: number;
  keywords: string[];
  video: string | null;
}

const PropertyItemSchema: Schema = new Schema({
  purpose: {
    purpose: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
  },
  status: { type: String, required: true },
  address: {
    location: { type: String, required: true },
  },
  type: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  subType: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  bed: { type: Number, required: true },
  bath: { type: Number, required: true },
  price: { type: Number, required: true },
  size: { type: Number, required: true },
  keywords: [{ type: String, required: true }],
  video: { type: String, default: null },
});

const PropertyItemModel = mongoose.model<PropertyItem>(
  'PropertyItem',
  PropertyItemSchema
);

export default PropertyItemModel;
