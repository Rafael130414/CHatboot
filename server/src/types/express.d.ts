declare global {
    namespace Express {
        interface Request {
            user: {
                id: number;
                companyId: number;
                role: string;
            };
        }
    }
}

export { };
