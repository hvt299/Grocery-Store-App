import { apiClient } from '../lib/apiClient';

export const getCategories = async () => {
    const { data } = await apiClient.get('/categories');
    return data;
};

export const addCategory = async (name: string) => {
    const { data } = await apiClient.post('/categories', { name });
    return data;
};

export const updateCategory = async (id: string, name: string) => {
    const { data } = await apiClient.patch(`/categories/${id}`, { name });
    return data;
};

export const deleteCategory = async (id: string) => {
    await apiClient.delete(`/categories/${id}`);
};

export const getProducts = async (page = 1, limit = 20, search = '', categoryId: string | null = null) => {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;

    const { data: response } = await apiClient.get('/products', { params });

    const mappedData = response.data.map((item: any) => ({
        ...item,
        category_id: item.categoryId?._id || null,
        categories: item.categoryId ? { name: item.categoryId.name } : null
    }));

    return {
        ...response,
        data: mappedData
    };
};

export const addProduct = async (productData: {
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    sku: string;
    unit: string;
    category_id: string | null;
    imageUrl: string;
}) => {
    const payload = {
        name: productData.name,
        price: productData.price,
        costPrice: productData.costPrice,
        stock: productData.stock,
        sku: productData.sku,
        unit: productData.unit,
        categoryId: productData.category_id,
        imageUrl: productData.imageUrl
    };
    const { data } = await apiClient.post('/products', payload);
    return data;
};

export const updateProduct = async (
    id: string,
    updates: { name?: string; price?: number; costPrice?: number; stock?: number; sku?: string; unit?: string; category_id?: string | null; imageUrl?: string }
) => {
    const payload: any = { ...updates };
    if (updates.category_id !== undefined) payload.categoryId = updates.category_id;

    const { data } = await apiClient.patch(`/products/${id}`, payload);
    return data;
};

export const deleteProduct = async (id: string) => {
    await apiClient.delete(`/products/${id}`);
};

export const getInvoices = async () => {
    const { data } = await apiClient.get('/invoices');
    return data.map((item: any) => ({
        ...item,
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
            productId: item._id,
            productName: item.name,
            unit: item.unit || 'Cái',
            quantity: item.quantity,
            price: item.price
        }))
    };

    const { data } = await apiClient.post('/invoices', payload);
    return data._id;
};

export const deleteInvoice = async (id: string) => {
    await apiClient.delete(`/invoices/${id}`);
};

export const uploadImageToCloudinary = async (imageUri: string) => {
    const { data: signData } = await apiClient.get('/products/upload-signature');

    const formData = new FormData();
    formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `upload_${Date.now()}.jpg`,
    } as any);

    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', signData.timestamp);
    formData.append('signature', signData.signature);

    const apiUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.secure_url;
    } catch (error) {
        console.error('Lỗi upload ảnh:', error);
        throw error;
    }
};