import React from 'react';
import Image from 'next/image';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'md' }) => {
    const sizes = {
        sm: { h: 45, w: 140 },
        md: { h: 70, w: 220 },
        lg: { h: 100, w: 320 },
        xl: { h: 180, w: 580 }
    };

    const selectedSize = sizes[size];

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Image
                src="/logo.png"
                alt="M-CALL Logo"
                width={selectedSize.w}
                height={selectedSize.h}
                className="object-contain"
                priority
            />
        </div>
    );
};

export default Logo;
