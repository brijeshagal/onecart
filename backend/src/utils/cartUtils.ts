import { cartModel, ICart, ISimplifiedCartItem } from '../models/Cart';
import { userModel } from '../models/User';
import { AddressData } from '../types/address';
import { User } from '../types/user';

// UUID generation using crypto module
const generateCartId = () =>
  `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Validates the add to cart request parameters
 */
export const validateAddToCartRequest = (
  reqBody: any
): { isValid: boolean; error?: string } => {
  const {
    senderUserId,
    receiverUserId,
    receiveAddress,
    items,
    quantity,
  } = reqBody;

  if (
    !senderUserId ||
    !receiverUserId ||
    !receiveAddress ||
    !items?.length
  ) {
    return {
      isValid: false,
      error: 'Sender ID, receiver ID, address, and items are required',
    };
  }

  if (quantity && quantity < 1) {
    return {
      isValid: false,
      error: 'Quantity must be at least 1',
    };
  }

  return { isValid: true };
};

/**
 * Validates that both sender and receiver users exist
 */
export const validateUsersExist = async (
  senderUserId: string,
  receiverUserId: string
): Promise<{
  isValid: boolean;
  sender?: User;
  receiver?: User;
  error?: string;
}> => {
  try {
    const [sender, receiver] = await Promise.all([
      userModel.findById(senderUserId),
      userModel.findById(receiverUserId),
    ]);

    if (!sender || !receiver) {
      return {
        isValid: false,
        error: 'Sender or receiver not found',
      };
    }

    return { isValid: true, sender, receiver };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error validating users',
    };
  }
};

/**
 * Updates cart with current receiver address
 */
export const updateCartReceiverAddress = async (cart: ICart): Promise<void> => {
  const updatedReceiver = await userModel.findById(cart.receiverUserId);
  if (updatedReceiver) {
    cart.receiveAddress =
      updatedReceiver.addresses[updatedReceiver.receiveAddressIndex] ||
      updatedReceiver.addresses[0];
  }
};

/**
 * Saves cart to database
 */
export const saveCart = async (cart: ICart): Promise<void> => {
  await cartModel.updateOne({ cartId: cart.cartId }, cart);
};

/**
 * Updates user's active cart reference
 */
export const updateUserActiveCart = async (
  userId: string,
  cartId: string
): Promise<void> => {
  await userModel.updateOne({ _id: userId }, { $push: { activeCartIds: cartId } });
};

/**
 * Handles existing cart - adds items to it
 */
export const handleExistingCart = async (
  existingCart: ICart,
  items: ISimplifiedCartItem[],
  quantity: number
): Promise<ICart> => {
  existingCart.items = items.map((item: ISimplifiedCartItem) => {
    const itemIndex = existingCart.items.findIndex(
      (i: ISimplifiedCartItem) => i.productId === item.productId
    );
    return itemIndex !== -1
      ? {
          ...existingCart.items[itemIndex]!,
          quantity: existingCart.items[itemIndex]!.quantity! + quantity,
        }
      : { ...item, quantity: quantity };
  });

  existingCart.totalItems = existingCart.items.reduce(
    (total: number, item: ISimplifiedCartItem) => total + item.quantity!,
    0
  );

  await saveCart(existingCart);
  return existingCart;
};

/**
 * Creates a new cart
 */
export const createNewCart = async (
  senderUserId: string,
  receiverUserId: string,
  receiveAddress: AddressData,
  items: ISimplifiedCartItem[],
  orderNotes?: string
): Promise<ICart> => {
  const newCart: ICart = {
    cartId: generateCartId(),
    senderUserId,
    receiverUserId,
    receiveAddress,
    items,
    totalItems: items.reduce(
      (total: number, item: ISimplifiedCartItem) => total + item.quantity!,
      0
    ),
    cartStatus: 'open',
    orderTimestamp: new Date(),
    orderNotes: orderNotes || '',
  };

  await cartModel.create(newCart);
  await updateUserActiveCart(senderUserId, newCart.cartId);
  return newCart;
};

/**
 * Removes an item from cart and updates totals
 */
export const removeCartItem = async (
  cart: ICart,
  productId: string
): Promise<{ success: boolean; error?: string }> => {
  const productIndex = cart.items.findIndex(
    (item: ISimplifiedCartItem) => item.productId === productId
  );

  if (productIndex === -1) {
    return { success: false, error: 'Product not found in cart' };
  }

  cart.items.splice(productIndex, 1);
  cart.totalItems = cart.items.reduce(
    (total: number, item: ISimplifiedCartItem) => total + item.quantity!,
    0
  );

  await saveCart(cart);
  return { success: true };
};

/**
 * Clears all items from cart and sets status to cancelled
 */
export const clearCart = async (cart: ICart): Promise<void> => {
  cart.items = [];
  cart.totalItems = 0;
  cart.cartStatus = 'cancelled';

  await saveCart(cart);
};

/**
 * Validates cart exists and belongs to user
 */
export const validateCartOwnership = async (
  userId: string,
  cartId?: string
): Promise<{ isValid: boolean; cart?: ICart; error?: string }> => {
  try {
    let cart: ICart | null = null;

    if (cartId) {
      cart = await cartModel.findByCartId(cartId);
      if (!cart) {
        return { isValid: false, error: 'Cart not found' };
      }
    } else {
      cart = await cartModel.findActiveCart(userId);
      if (!cart) {
        return { isValid: false, error: 'No active cart found' };
      }
    }

    return { isValid: true, cart };
  } catch (error) {
    return { isValid: false, error: 'Error validating cart ownership' };
  }
};
