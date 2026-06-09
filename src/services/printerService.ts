import { Alert } from 'react-native';

// BẬT CÔNG TẮC NÀY THÀNH 'TRUE' CHẠY TRÊN MÁY IN THẬT
const IS_REAL_PRINTER_CONNECTED = false;

export const printReceipt = async (invoiceData: any) => {
    try {
        if (!IS_REAL_PRINTER_CONNECTED) {
            // CHẾ ĐỘ GIẢ LẬP (MOCK MODE)
            console.log("\n==================================");
            console.log("       HÓA ĐƠN TẠP HÓA A&B        ");
            console.log("==================================");
            console.log(`Mã HĐ: ${invoiceData.invoiceId}`);
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