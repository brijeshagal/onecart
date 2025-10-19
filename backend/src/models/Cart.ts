import mongoose, { Schema } from 'mongoose';
import { AddressData } from '../types/address';

// Simplified Cart Item schema - only essential product data + quantity
export interface ISimplifiedCartItem {
  productId: string;
  identityId: string;
  name: string;
  quantity: number;
  addedAt: Date;
}

const SimplifiedCartItemSchema = new Schema<ISimplifiedCartItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    identityId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    _id: true,
  }
);

// Create Cart schema for multi-user order/cart system
export interface ICart {
  // Core cart identification
  cartId: string;

  // User relationships
  senderUserId: string;
  receiverUserId: string;

  // Delivery information
  receiveAddress: AddressData;

  // Cart contents and metadata (simplified)
  itemsOrdered: ISimplifiedCartItem[];
  totalItems: number;

  // Cart status and timestamps
  cartStatus: 'open' | 'in-progress' | 'fulfilled' | 'cancelled';
  orderTimestamp: Date;
  fulfillmentTimestamp?: Date;

  // Additional metadata
  orderNotes?: string;
  totalAmount?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const CartSchema = new Schema<ICart>(
  {
    cartId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderUserId: {
      type: String,
      required: true,
      index: true,
    },
    receiverUserId: {
      type: String,
      required: true,
      index: true,
    },
    receiveAddress: {
      type: Schema.Types.Mixed, // AddressData is complex object
      required: true,
    },
    itemsOrdered: [SimplifiedCartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    cartStatus: {
      type: String,
      enum: ['open', 'in-progress', 'fulfilled', 'cancelled'],
      default: 'open',
      index: true,
    },
    orderTimestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    fulfillmentTimestamp: {
      type: Date,
      default: null,
    },
    orderNotes: {
      type: String,
      default: '',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

// Lazy model creation - only create when Mongoose is connected
let CartModel: mongoose.Model<ICart> | null = null;

export function getCartModel(): mongoose.Model<ICart> {
  if (!CartModel) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected. Cannot create Cart model.');
    }
    CartModel = mongoose.model<ICart>('Cart', CartSchema);
  }
  return CartModel;
}

// For backward compatibility, export a model that will work with both connected and fallback scenarios
export const cartModel = {
  create: async (data: any) => {
    try {
      const Model = getCartModel();
      return await Model.create(data);
    } catch (error) {
      console.error('❌ Failed to create cart:', error);
      throw error;
    }
  },
  findById: async (id: string) => {
    try {
      const Model = getCartModel();
      return await Model.findById(id);
    } catch (error) {
      console.error('❌ Failed to find cart by ID:', error);
      return null;
    }
  },
  findOne: async (conditions: any) => {
    try {
      const Model = getCartModel();
      return await Model.findOne(conditions);
    } catch (error) {
      console.error('❌ Failed to find cart:', error);
      return null;
    }
  },
  updateOne: async (filter: any, update: any) => {
    try {
      const Model = getCartModel();
      return await Model.updateOne(filter, update);
    } catch (error) {
      console.error('❌ Failed to update cart:', error);
      throw error;
    }
  },
  deleteOne: async (conditions: any) => {
    try {
      const Model = getCartModel();
      return await Model.deleteOne(conditions);
    } catch (error) {
      console.error('❌ Failed to delete cart:', error);
      throw error;
    }
  },
  findByUserId: async (userId: string) => {
    try {
      const Model = getCartModel();
      return await Model.findOne({ userId });
    } catch (error) {
      console.error('❌ Failed to find cart by user ID:', error);
      return null;
    }
  },
  findBySenderId: async (senderUserId: string) => {
    try {
      const Model = getCartModel();
      return await Model.find({ senderUserId }).sort({ orderTimestamp: -1 });
    } catch (error) {
      console.error('❌ Failed to find carts by sender ID:', error);
      return [];
    }
  },
  findByReceiverId: async (receiverUserId: string) => {
    try {
      const Model = getCartModel();
      return await Model.find({ receiverUserId }).sort({ orderTimestamp: -1 });
    } catch (error) {
      console.error('❌ Failed to find carts by receiver ID:', error);
      return [];
    }
  },
  findActiveCart: async (senderUserId: string) => {
    try {
      const Model = getCartModel();
      return await Model.findOne({
        senderUserId,
        cartStatus: 'open',
      }).sort({ orderTimestamp: -1 });
    } catch (error) {
      console.error('❌ Failed to find active cart:', error);
      return null;
    }
  },
  findByCartId: async (cartId: string) => {
    try {
      const Model = getCartModel();
      return await Model.findOne({ cartId });
    } catch (error) {
      console.error('❌ Failed to find cart by cart ID:', error);
      return null;
    }
  },
} as any;
