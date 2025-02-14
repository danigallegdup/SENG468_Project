// utils/responseHandler.js
exports.successResponse = (res, data, message = 'Success') => {
    res.json({ success: true, message, data });
};

exports.errorResponse = (res, message = 'Server Error', statusCode = 500) => {
    res.status(statusCode).json({ success: false, message });
};
