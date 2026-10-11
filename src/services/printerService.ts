import { Alert } from 'react-native';

// Cấu hình từ file môi trường .env (EXPO_PUBLIC_*)
const IS_REAL_PRINTER_CONNECTED = process.env.EXPO_PUBLIC_ENABLE_REAL_PRINTER === 'true';
const STORE_NAME = process.env.EXPO_PUBLIC_STORE_NAME || 'TẠP HÓA THÔNG MINH A&B';
const STORE_PHONE = process.env.EXPO_PUBLIC_STORE_PHONE || '0987.654.321';
const STORE_ADDRESS = process.env.EXPO_PUBLIC_STORE_ADDRESS || '123 Đường Bán Lẻ, TP. Hồ Chí Minh';

export const printReceipt = async (invoiceData: any) => {
    try {
        if (!IS_REAL_PRINTER_CONNECTED) {
            // CHẾ ĐỘ GIẢ LẬP (MOCK MODE)
            console.log("\n==================================");
            console.log(`       ${STORE_NAME.toUpperCase()}       `);
            console.log(`Đ/C: ${STORE_ADDRESS}`);
            console.log(`SĐT: ${STORE_PHONE}`);
            console.log("==================================");
            console.log(`Mã HĐ: ${invoiceData.invoiceId}`);
            console.log(`Người bán: ${invoiceData.sellerName || 'Thu ngân'}`);
            console.log(`Thời gian: ${new Date().toLocaleString()}`);
            console.log("----------------------------------");
            invoiceData.items.forEach((item: any) => {
                console.log(`${item.name} x ${item.quantity}  =  ${item.price * item.quantity}đ`);
            });
            console.log("----------------------------------");
            console.log(`TỔNG CỘNG:            ${invoiceData.totalAmount}đ`);
            console.log("==================================\n");

            Alert.alert(
                "Đã in hóa đơn (Demo)",
                "Dữ liệu hóa đơn đã được bắn ra cửa sổ Terminal (Console). Mở Terminal để xem bill giấy giả lập!"
            );

            return true;
        }

        // CHẾ ĐỘ THẬT (REAL MODE): Code thư viện Bluetooth
        // Ví dụ: 
        // await BluetoothPrinter.connect('MAC_ADDRESS');
        // await BluetoothPrinter.printText('Hóa đơn Tạp Hóa\n');
        // ...

        return true;

    } catch (error) {
        console.error("Lỗi in ấn:", error);
        Alert.alert("Lỗi máy in", "Không thể in hóa đơn lúc này.");
        return false;
    }
}