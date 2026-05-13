/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: "#0a1628",
                    800: "#0f2040",
                    700: "#162952",
                    600: "#1e3a6e",
                },
                emerald: {
                    DEFAULT: "#00c9a7",
                    dark: "#007a65",
                    deep: "#009E82",
                }
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                display: ["Space Grotesk", "sans-serif"],
            },
            backgroundImage: {
                'glow-gradient': 'radial-gradient(circle at center, var(--tw-gradient-from), transparent 70%)',
            }
        },
    },
    plugins: [],
};
