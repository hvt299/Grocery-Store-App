import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

// Định nghĩa nhanh kiểu dữ liệu dựa trên file database.ts
type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

// Lấy danh sách danh mục
export const getCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Category[];
};

// Lấy danh sách sản phẩm (kèm tên danh mục)
export const getProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select(`
      *,
      categories ( name ) 
    `) // Cú pháp này để lấy luôn tên danh mục từ bảng categories
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as (Product & { categories: { name: string } | null })[];
};

// Thêm sản phẩm mới
export const addProduct = async (productData: {
    name: string;
    price: number;
    unit: string;
    category_id: number | null;
}) => {
    const { data, error } = await supabase
        .from('products')
        .insert([productData] as any)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Cập nhật sản phẩm
export const updateProduct = async (
    id: number,
    updates: { name?: string; price?: number; unit?: string; category_id?: number | null }
) => {
    const { error } = await supabase
        .from('products')
        // @ts-ignore
        .update(updates)
        .eq('id', id);

    if (error) throw error;
};

// Xóa sản phẩm
export const deleteProduct = async (id: number) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
};

// Lấy danh sách hóa đơn
export const getInvoices = async () => {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      invoice_items (
        product_name,
        quantity,
        unit,
        price
      )
    `) // Lấy hóa đơn KÈM THEO chi tiết các món
        .order('created_at', { ascending: false }); // Đơn mới nhất lên đầu

    if (error) throw error;
    return data;
};

// Tạo hóa đơn
export const createInvoice = async (cartItems: any[], totalAmount: number) => {
    // 1. Tạo hóa đơn trước
    const { data, error } = await supabase
        .from('invoices')
        .insert([{
            total_amount: totalAmount,
            payment_method: 'cash'
        }] as any)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error('Không tạo được hóa đơn');

    const invoiceData = data as any;
    const invoiceId = invoiceData.id;

    // 2. Chuẩn bị dữ liệu chi tiết hóa đơn
    const itemsToInsert = cartItems.map(item => ({
        invoice_id: invoiceId,
        product_id: item.id,
        product_name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price
    }));

    // 3. Lưu chi tiết hóa đơn
    const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert as any);

    if (itemsError) throw itemsError;

    return invoiceId;
};

// 1. Thêm danh mục
export const addCategory = async (name: string) => {
    const { error } = await supabase
        .from('categories')
        .insert([{ name }] as any); // Dùng as any để tránh lỗi TypeScript
    if (error) throw error;
};

// 2. Sửa danh mục
export const updateCategory = async (id: number, name: string) => {
    const { error } = await supabase
        .from('categories')
        // @ts-ignore
        .update({ name } as any)
        .eq('id', id);
    if (error) throw error;
};

// 3. Xóa danh mục
export const deleteCategory = async (id: number) => {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
    if (error) throw error;
};