export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  images: string[];
  stock: number;
  description: string;
  sizes: string[];
  isTrending: boolean;
  isNewArrival: boolean;
}

export interface CartItem {
  id: string; // This will act as productId in context of cart
  cartItemId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size: string;
}

export interface WishlistItem {
  id: string; // This will act as productId
  name: string;
  price: number;
  image: string;
}

export interface OrderItem {
  cartItemId: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  shippingAddress: string;
  zipCode: string;
  paymentMethod: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled' | 'pending' | 'cancelled'; // added lowercase to be safe with user input
  totalAmount: number;
  createdAt: any;
  cancelledAt?: any;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    size: string;
    imageUrl: string;
  }>;
}

export interface Customer {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: any;
}
