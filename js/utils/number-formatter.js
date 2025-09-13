class NumberFormatter {
    
    static formatNumber(num, isPrice = false) {
        if (num === 0 || num === null || num === undefined || isNaN(num)) {
            return '0';
        }
        const absNum = Math.abs(num);
        if (isPrice && absNum < 0.001) {
            return this.formatSmallPrice(num);
        }
        if (absNum < 1) {
            if (absNum >= 0.01) return num.toFixed(4);
            if (absNum >= 0.001) return num.toFixed(5);
            return this.formatSmallPrice(num);
        }
        if (absNum < 1000) return num.toFixed(2);
        if (absNum < 1000000) return (num/1000).toFixed(1) + 'K';
        if (absNum < 1000000000) return (num/1000000).toFixed(1) + 'M';
        return (num/1000000000).toFixed(1) + 'B';
    }
    
    static formatSmallPrice(num) {
        if (num === 0 || isNaN(num)) return '0';
        const sign = num < 0 ? '-' : '';
        const absNum = Math.abs(num);
        const sciNotation = absNum.toExponential();
        const [mantissa, exponent] = sciNotation.split('e');
        const exp = parseInt(exponent);
        if (exp >= -3) {
            return sign + absNum.toFixed(Math.abs(exp) + 4);
        }
        const digits = mantissa.replace('.', '');
        const zerosCount = Math.abs(exp) - 1;
        const significantDigits = digits.substring(0, Math.min(6, digits.length));
        return `${sign}0.0(${zerosCount})${significantDigits}`;
    }
    
    static formatPrice(price) {
        return this.formatNumber(price, true);
    }
    
    static formatVolume(volume) {
        return this.formatNumber(volume, false);
    }
}
window.formatNumber = (num, isPrice = false) => NumberFormatter.formatNumber(num, isPrice);
window.formatPrice = (price) => NumberFormatter.formatPrice(price);
window.formatVolume = (volume) => NumberFormatter.formatVolume(volume);