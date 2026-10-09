import React from 'react';
import {
  Box,
  Text,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { InvoicesTable } from './InvoicesTable';

export const AllInvoices = () => {
  return (
    <React.Fragment>
      <Box
        w="100%"
        maxW="100%"
        p="6"
        shadow="sm"
        h="100%"
        position="relative"
        overflow="auto"
        overflowX="hidden"
      >
        <Box>
          <Text as="span" fontSize="16px" fontWeight="400"><Link to="/app/myprofile">
            <Text as="span" color="#2977FF" textDecoration="underline">Profile</Text></Link>  / <Text as="span" color="#6C757D">
              Billing & Invoices
            </Text></Text>
        </Box>
        <InvoicesTable viewAllBtn={false} />
      </Box>
    </React.Fragment >
  );
};

