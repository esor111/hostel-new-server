import { DataSource } from 'typeorm';
import { dataSourceOptions } from './src/database/data-source';

export default new DataSource(dataSourceOptions);