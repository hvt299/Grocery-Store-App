import { apiClient } from '../lib/apiClient';

const mapId = (item: any) => ({ ...item, id: item._id });

export const getCategories = async () => {
    const { data } = await apiClient.get('/categories');
    return data.map(mapId);
};

export const addCategory = async (name: string) => {
    const { data } = await apiClient.post('/categories', { name });
    return mapId(data);
};

export const updateCategory = async (id: string | number, name: string) => {
    const { data } = await apiClient.patch(`/categories/${id}`, { name });
    return mapId(data);
};

export const deleteCategory = async (id: string | number) => {
    await apiClient.delete(`/categories/${id}`);
};

export const getProducts = async () => {
    const { data } = await apiClient.get('/products');
    return data.map((item: any) => ({
        ...item,
        id: item._id,
        category_id: item.categoryId?._id || null,
        categories: item.categoryId ? { name: item.categoryId.name } : null
    }));
};

export const addProduct = async (productData: {
    name: string;
    price: number;
    unit: string;
    category_id: string | number | null;
}) => {
    const payload = {
        name: productData.name,
        price: productData.price,
        unit: productData.unit,
        categoryId: productData.category_id,
    };
    const { data } = await apiClient.post('/products', payload);
    return mapId(data);
};

export const updateProduct = async (
    id: string | number,
    updates: { name?: string; price?: number; unit?: string; category_id?: string | number | null }
) => {
    const payload: any = { ...updates };
    if (updates.category_id !== undefined) payload.categoryId = updates.category_id;

    const { data } = await apiClient.patch(`/products/${id}`, payload);
    return mapId(data);
};

export const deleteProduct = async (id: string | number) => {
    await apiClient.delete(`/products/${id}`);
};

export const getInvoices = async () => {
    const { data } = await apiClient.get('/invoices');
    return data.map((item: any) => ({
        ...item,
        id: item._id,
        total_amount: item.totalAmount,
        created_at: item.createdAt,
        invoice_items: item.items.map((i: any) => ({
            product_name: i.productName,
            quantity: i.quantity,
            unit: i.unit,
            price: i.price,
        }))
    }));
};

export const createInvoice = async (cartItems: any[], totalAmount: number) => {
    const payload = {
        totalAmount,
        paymentMethod: 'Cash',
        items: cartItems.map(item => ({
            productId: item.id,
            productName: item.name,
            unit: item.unit || 'Cái',
            quantity: item.quantity,
            price: item.price
        }))
    };

    const { data } = await apiClient.post('/invoices', payload);
    return data._id;
};

export const deleteInvoice = async (id: string | number) => {
    await apiClient.delete(`/invoices/${id}`);
};