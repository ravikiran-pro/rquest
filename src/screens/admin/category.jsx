import React, { useEffect, useState } from 'react';
import DataTable from '../../app/components/datatable';
import { Button, Col, Row, message } from 'antd'; // Import message from 'antd'
import { apiConfig, netWorkCall } from '../../app/utils';
import { PlusOutlined } from '@ant-design/icons';

const Category = ({
    handleSubCategory = () => null
}) => {

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });
    const columns = [
        { key: "name", title: "Name" },
        { key: "img_url", title: "Image" },
        { key: "createdBy", title: "Created By" },
        { key: "is_active", title: "Active" },
        { key: "action", title: "Action" },
        { key: "menu", title: "Sub Category", onClick: (data) => handleSubCategory(data) },
    ];

    const handleDelete = async (record) => {
        try {
            let res = await netWorkCall(
                apiConfig.master_categories_delete,
                'DELETE',
                JSON.stringify({
                    category_id: record.id,
                }),
                true
            );

            // Update the local state
            fetchInitData(pagination.current);

            // Show success message
            message.success(res.message);
        } catch (error) {
            console.error('Error updating category status:', error);
            message.error('Failed to update category status');
        }
    }

    const fetchInitData = async (current = 1) => {
        try {
            const response = await netWorkCall(
                apiConfig.master_categories,
                'POST',
                JSON.stringify({
                    limit: pagination.pageSize,
                    offset: (current - 1) * pagination.pageSize,
                }),
                true
            );

            setPagination({
                ...pagination,
                current,
                total: response?.count || 0,
            });
            setRows(response.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleTableChange = (pagination, filters, sorter) => {
        const { current, pageSize } = pagination;
        fetchInitData(current);
    };

    const handleStatusChange = async ({ category_id, is_active }) => {
        try {
            await netWorkCall(
                apiConfig.master_categories_stauts,
                'PUT',
                JSON.stringify({
                    category_id,
                    is_active
                }),
                true
            );

            // Update the local state
            fetchInitData(pagination.current);

            // Show success message
            message.success('Category status updated successfully');
        } catch (error) {
            console.error('Error updating category status:', error);
            message.error('Failed to update category status');
        }
    };

    const handleRowChange = async ({ id, name, img_url, is_active }) => {
        try {
            await netWorkCall(
                apiConfig.master_categories_create,
                'POST',
                JSON.stringify({
                    category_id: id >= 0 ? id : undefined,
                    name: name,
                    img_url: img_url,
                    is_active: is_active,
                    count: pagination?.total
                }),
                true
            );

            // Update the local state
            fetchInitData(pagination.current);

            // Show success message
            message.success('Category edited successfully');
        } catch (error) {
            console.error('Error editing category:', error);
            message.error('Failed to edit category');
        }
    };

    useEffect(() => {
        fetchInitData();
    }, []);

    return (
        <>
            <DataTable
                rows={rows}
                pagination={pagination}
                columns={columns}
                initRow={{
                    name: '',
                    img_url: '',
                    is_active: true
                }}
                isAddNew={true}
                handleTableChange={handleTableChange}
                handleStatusChange={handleStatusChange}
                handleRowChange={handleRowChange}
                handleDelete={handleDelete}
            />
        </>
    );
};

export default Category;
