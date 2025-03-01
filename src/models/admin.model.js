import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const AdminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            url: {
                type: String,
                default: "",
            },
            publicId: {
                type: String,
                default: "",
            },
        },
        role: {
            type: String,
            default: "ADMIN",
            enum: ["ADMIN", "SUPPORT"],
        },
    },
    { timestamps: true }
);

AdminSchema.pre("save", function (next) {
    if (!this.isModified("password")) return next();
    bcrypt.hash(this.password, 10, (err, hash) => {
        if (err) return next(err);
        this.password = hash;
        next();
    });
});

const Admin = mongoose.model("Admin", AdminSchema);

export const initializeAdmin = async () => {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
        const defaultAdmin = new Admin({
            username: "admin",
            password: "admin123",
            role: "ADMIN",
        });
        await defaultAdmin.save();
    }
};

export default Admin;