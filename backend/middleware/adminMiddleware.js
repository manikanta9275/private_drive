function requireAdmin(req, res, next) {

    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "You are not authorized"
        });
    }

    next();
}

module.exports = requireAdmin;