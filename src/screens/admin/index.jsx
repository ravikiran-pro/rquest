import React, { useState } from 'react';
import Category from './category';
import { Col, Row } from 'antd';
import { Tabs } from 'antd';
import './index.css'
import SubCategory from './subcategory';
import Products from './products';



const Admin = () => {

  const [activeKey, setActiveKey] = useState(1)
  const [CategoryId, setCategoryId] = useState(null);
  const [subCategoryId, setSubCategoryId] = useState(null);

  const onChange = (key) => {
    setActiveKey(key)
    setCategoryId(null)
    setSubCategoryId(null)
  };
  
  
  const handleSubCategory = (row) => {
    setCategoryId(row?.id)
    setActiveKey(2)
  }

  const handleProducts = (row) => {
    setSubCategoryId(row?.id)
    setActiveKey(3)
  }
  
  const items = [
    {
      key: 1,
      label: 'Category',
      children: <Category handleSubCategory={handleSubCategory} />
    },
    {
      key: 2,
      label: 'Sub Category',
      children: <SubCategory category_id={CategoryId} handleProducts={handleProducts} />,
    },
    {
      key: 3,
      label: 'Products',
      children: <Products category_id={CategoryId} sub_category_id={subCategoryId} />,
    },
  ];

  return <Row justify={'center'} >
    <Col span={20}>
      <Tabs activeKey={activeKey} items={items} onChange={onChange} />;
    </Col>
  </Row>
}

export default Admin;