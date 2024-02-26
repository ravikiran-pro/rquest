import React, { useEffect, useState } from 'react';
import { Space, Table, Tag, Form, Input, Button, Row, Col } from 'antd';
import { Avatar } from 'antd';
import { Upload } from 'antd';
import { apiConfig, config, netWorkCall } from '../../utils';
import { PlusOutlined } from '@ant-design/icons';

const DataTable = ({ rows, columns, initRow, isAddNew, pagination, handleTableChange, handleStatusChange, handleRowChange, handleDelete }) => {
  const [data, setData] = useState(rows);
  const [editableRow, setEditableRow] = useState(null);
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    setData(rows);
  }, [rows]);


  const handleStateUpdate = (updatedState, index) => {
    const newData = data;
    newData[index] = {
      ...newData[index],
      ...updatedState
    };
    setData([...newData])
    return newData[index]
  }

  const handleChange = (keyName, value, index) => {
    if (keyName === 'is_active') {
      handleStatusChange({ category_id: data[index]?.id, is_active: value })
    }
    handleStateUpdate({ [keyName]: value }, index)
  };

  const handleEdit = (index) => {
    setEditableRow(index);
  };

  const handleSave = (index) => {
    const newData = data;
    handleRowChange({ ...newData[index] })
    setEditableRow(null)
  };

  const onImageUpload = async (file, index) => {
    try {
      const formData = new FormData();
      formData.append('fileData', file);

      const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
        method: 'POST',
        body: formData,
      });
      const { data } = await response.json();
      handleStateUpdate({ 'img_url': data?.Location }, index)
    } catch (error) {
      console.error(error);
    }
  };

  const renderCell = (item, value, record, index) => {
    const key = item.key;
    const isEditable = index === editableRow;

    switch (key) {
      case 'img_url':
        return isEditable ? <Upload
          listType="picture"
          beforeUpload={(file) => onImageUpload(file, index)}
          maxCount={1}
        >
          <Space size="middle">
            <a>upload</a>
          </Space>
        </Upload> :
          <Avatar src={value || 'data:image/jpeg;base64,/9j/4AAQ...'} alt='none' />
      case 'menu':
        return <Button style={{ color: '#fff' }} onClick={() => item?.onClick(record)}> Add {item?.title} </Button>
      case 'createdBy':
        return <span>Admin</span>;
      case 'is_active':
        return (
          <Tag color={value ? 'green' : 'red'} onClick={() => handleChange("is_active", !value, index)}>
            {value ? 'Active' : 'In Active'}
          </Tag>
        );
      case 'action':
        return isEditable ? (
          <Space size="middle">
            <a onClick={() => handleSave(index)}>Save</a>
            <a onClick={() => {
              setData(rows);
              setEditableRow(null);
              setIsNew(false)
            }}>Cancel</a>
          </Space>
        ) : (
          <>
            <Space size="middle" onClick={() => handleEdit(index)}>
              <a>Edit</a>
            </Space>
            <Space size="middle" style={{marginLeft: 10}} onClick={() => handleDelete(record)}>
            <a>Delete</a>
          </Space>
          </>
        );
      default:
        return isEditable ? (
          <Input defaultValue={value} onChange={(e) => handleChange(key, e.target.value, index)} />
        ) : (
          value
        );
    }
  };

  const columnsRender = columns.map((item) => ({
    title: item.title,
    dataIndex: item.key,
    key: item.key,
    render: (value, record, index) => renderCell(item, value, record, index),
  }));


  React.useEffect(() => {
    if (isNew) {
      setData([initRow, ...data]);
      setEditableRow(0)
    } else {
      setData([...rows]);
      setEditableRow(null)
    }
  }, [isNew])

  return <>
    <Col span={24} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
      {
        isAddNew && <Row>
          <Col>
            <Button type='primary' onClick={() => setIsNew(!isNew)}>
              Add New
              <PlusOutlined />
            </Button>
          </Col>
        </Row>
      }
    </Col>
    <Table
      columns={columnsRender}
      dataSource={data}
      pagination={pagination}
      onChange={handleTableChange}
    />
  </>
};

export default DataTable;
